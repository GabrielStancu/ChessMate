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
            .OrderBy(item => item.Ply)
            .Select(item => new BatchCoachCoachingItemEnvelope(
                item.Ply,
                item.Classification,
                item.IsUserMove,
                item.Move,
                item.Explanation))
            .ToArray();

        var summary = new BatchCoachSummaryEnvelope(
            request.GameId,
            request.Moves.Count,
            coaching.Length,
            string.IsNullOrWhiteSpace(request.AnalysisMode) ? DefaultAnalysisMode : request.AnalysisMode);

        var metadata = new BatchCoachMetadataEnvelope(
            completedAtUtc,
            BatchCoachClassificationPolicy.EligibleClassifications);

        return new BatchCoachResponseEnvelope(
            SchemaVersion,
            operationId,
            summary,
            coaching,
            metadata);
    }
}
