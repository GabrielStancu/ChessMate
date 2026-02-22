using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Contracts;
using ChessMate.Infrastructure.BatchCoach;
using Microsoft.ApplicationInsights;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Functions;

public sealed class BatchCoachDurableFunctions
{
    private const string LatencyMetricName = "batchcoach.coachmove.latency.ms";
    private const string PromptTokensMetricName = "batchcoach.coachmove.tokens.prompt";
    private const string CompletionTokensMetricName = "batchcoach.coachmove.tokens.completion";
    private const string TotalTokensMetricName = "batchcoach.coachmove.tokens.total";

    private readonly ILogger<BatchCoachDurableFunctions> _logger;
    private readonly ICoachMoveGenerator _coachMoveGenerator;
    private readonly TelemetryClient _telemetryClient;

    public BatchCoachDurableFunctions(
        ILogger<BatchCoachDurableFunctions> logger,
        ICoachMoveGenerator coachMoveGenerator,
        TelemetryClient telemetryClient)
    {
        _logger = logger;
        _coachMoveGenerator = coachMoveGenerator;
        _telemetryClient = telemetryClient;
    }

    [Function(nameof(BatchCoachOrchestratorAsync))]
    public static async Task<BatchCoachResponseEnvelope> BatchCoachOrchestratorAsync(
        [OrchestrationTrigger] TaskOrchestrationContext orchestrationContext)
    {
        var logger = orchestrationContext.CreateReplaySafeLogger(nameof(BatchCoachOrchestratorAsync));
        var input = orchestrationContext.GetInput<BatchCoachOrchestrationInput>()
            ?? throw new InvalidOperationException("Batch coach orchestration input is required.");

        var eligibleMoves = BatchCoachClassificationPolicy.SelectEligibleMoves(input.Request.Moves);

        logger.LogInformation(
            "Batch coach orchestration started. operationId {OperationId}, totalMoves {TotalMoves}, eligibleMoves {EligibleMoves}.",
            input.OperationId,
            input.Request.Moves.Count,
            eligibleMoves.Count);

        var activityTasks = eligibleMoves
            .Select(move => orchestrationContext.CallActivityAsync<CoachMoveActivityResult>(
                nameof(CoachMoveActivityAsync),
                new CoachMoveActivityInput(input.OperationId, input.Request.GameId, input.Request.AnalysisMode, move)))
            .ToArray();

        var coachingItems = activityTasks.Length == 0
            ? new CoachMoveActivityResult[] { }
            : await Task.WhenAll(activityTasks);

        var response = BatchCoachResponseMapper.Create(
            input.Request,
            input.OperationId,
            coachingItems,
            orchestrationContext.CurrentUtcDateTime);

        logger.LogInformation(
            "Batch coach orchestration completed. operationId {OperationId}, coachingCount {CoachingCount}.",
            input.OperationId,
            response.Coaching.Count);

        return response;
    }

    [Function(nameof(CoachMoveActivityAsync))]
    public async Task<CoachMoveActivityResult> CoachMoveActivityAsync(
        [ActivityTrigger] CoachMoveActivityInput input)
    {
        _logger.LogInformation(
            "Coach move activity invoked. operationId {OperationId}, ply {Ply}, classification {Classification}, isUserMove {IsUserMove}.",
            input.OperationId,
            input.Move.Ply,
            input.Move.Classification,
            input.Move.IsUserMove);

        var generationRequest = new CoachMoveGenerationRequest(
            input.OperationId,
            input.GameId,
            input.AnalysisMode,
            input.Move.Ply,
            input.Move.Classification,
            input.Move.IsUserMove,
            input.Move.Move,
            input.Move.Piece,
            input.Move.From,
            input.Move.To);

        var generationResult = await _coachMoveGenerator.GenerateAsync(
            generationRequest,
            CancellationToken.None);

        var moveText = string.IsNullOrWhiteSpace(input.Move.Move)
            ? CoachMovePromptComposer.CreateMoveText(generationRequest)
            : input.Move.Move.Trim();

        var result = new CoachMoveActivityResult(
            input.Move.Ply,
            input.Move.Classification,
            input.Move.IsUserMove,
            moveText,
            generationResult.Explanation,
            generationResult.WhyWrong,
            generationResult.ExploitPath,
            generationResult.SuggestedPlan,
            generationResult.PromptTokens,
            generationResult.CompletionTokens,
            generationResult.TotalTokens,
            generationResult.LatencyMs,
            generationResult.Model);

        EmitTelemetry(input, result);

        _logger.LogInformation(
            "Coach move activity completed. operationId {OperationId}, ply {Ply}, model {Model}, latencyMs {LatencyMs}, totalTokens {TotalTokens}.",
            input.OperationId,
            result.Ply,
            result.Model,
            result.LatencyMs,
            result.TotalTokens);

        return result;
    }

    private void EmitTelemetry(CoachMoveActivityInput input, CoachMoveActivityResult result)
    {
        var dimensions = new Dictionary<string, string>
        {
            ["operationId"] = input.OperationId,
            ["gameId"] = input.GameId,
            ["analysisMode"] = input.AnalysisMode ?? "Quick",
            ["ply"] = result.Ply.ToString(),
            ["classification"] = result.Classification,
            ["isUserMove"] = result.IsUserMove.ToString(),
            ["model"] = result.Model ?? "unknown"
        };

        _telemetryClient.TrackMetric(LatencyMetricName, result.LatencyMs, dimensions);
        _telemetryClient.TrackMetric(PromptTokensMetricName, result.PromptTokens, dimensions);
        _telemetryClient.TrackMetric(CompletionTokensMetricName, result.CompletionTokens, dimensions);
        _telemetryClient.TrackMetric(TotalTokensMetricName, result.TotalTokens, dimensions);
    }
}
