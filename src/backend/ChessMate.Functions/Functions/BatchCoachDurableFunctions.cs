using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Contracts;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Functions;

public sealed class BatchCoachDurableFunctions
{
    private readonly ILogger<BatchCoachDurableFunctions> _logger;

    public BatchCoachDurableFunctions(ILogger<BatchCoachDurableFunctions> logger)
    {
        _logger = logger;
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
                new CoachMoveActivityInput(input.OperationId, move)))
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
    public Task<CoachMoveActivityResult> CoachMoveActivityAsync(
        [ActivityTrigger] CoachMoveActivityInput input)
    {
        _logger.LogInformation(
            "Coach move activity invoked. operationId {OperationId}, ply {Ply}, classification {Classification}, isUserMove {IsUserMove}.",
            input.OperationId,
            input.Move.Ply,
            input.Move.Classification,
            input.Move.IsUserMove);

        var moveText = string.IsNullOrWhiteSpace(input.Move.Move)
            ? "the move"
            : input.Move.Move;

        var explanation = input.Move.IsUserMove
            ? $"You played {moveText}. Coaching generation will be enhanced in the AI activity ticket."
            : $"Opponent played {moveText}. Coaching generation will be enhanced in the AI activity ticket.";

        var result = new CoachMoveActivityResult(
            input.Move.Ply,
            input.Move.Classification,
            input.Move.IsUserMove,
            moveText,
            explanation);

        _logger.LogInformation(
            "Coach move activity completed. operationId {OperationId}, ply {Ply}.",
            input.OperationId,
            result.Ply);

        return Task.FromResult(result);
    }
}
