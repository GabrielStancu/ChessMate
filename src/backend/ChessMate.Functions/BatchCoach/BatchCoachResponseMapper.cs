using ChessMate.Functions.Contracts;

namespace ChessMate.Functions.BatchCoach;

public static class BatchCoachResponseMapper
{
    private const string SchemaVersion = "1.0";
    private const string DefaultAnalysisMode = "Quick";

    public static BatchCoachResponseEnvelope Create(
        BatchCoachRequestEnvelope request,
        string operationId,
        IReadOnlyList<CoachMoveActivityResult> activityResults,
        DateTimeOffset completedAtUtc)
    {
        var coaching = activityResults
            .Where(item => item.IsSuccessful)
            .OrderBy(item => item.Ply)
            .Select(item => new BatchCoachCoachingItemEnvelope(
                item.Ply,
                item.Classification,
                item.IsUserMove,
                item.Move ?? string.Empty,
                item.Explanation ?? string.Empty))
            .ToArray();

        var warnings = activityResults
            .Where(item => !item.IsSuccessful)
            .OrderBy(item => item.Ply)
            .Select(item => new BatchCoachWarningEnvelope(
                item.Ply,
                item.Classification,
                item.Move,
                item.FailureCode ?? BatchCoachFailureCodes.OrchestrationFailed,
                item.FailureMessage ?? "Coach generation failed."))
            .ToArray();

        var eligibleMoveCount = BatchCoachClassificationPolicy.SelectEligibleMoves(request.Moves).Count;
        var responseFailureCode = warnings.Length > 0
            ? BatchCoachFailureCodes.PartialCoaching
            : null;

        var summary = new BatchCoachSummaryEnvelope(
            request.GameId,
            request.Moves.Count,
            eligibleMoveCount,
            string.IsNullOrWhiteSpace(request.AnalysisMode) ? DefaultAnalysisMode : request.AnalysisMode);

        var metadata = new BatchCoachMetadataEnvelope(
            completedAtUtc,
            BatchCoachClassificationPolicy.EligibleClassifications,
            warnings,
            responseFailureCode);

        return new BatchCoachResponseEnvelope(
            SchemaVersion,
            operationId,
            summary,
            coaching,
            metadata);
    }
}
