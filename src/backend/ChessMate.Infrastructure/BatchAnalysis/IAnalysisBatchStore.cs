namespace ChessMate.Infrastructure.BatchAnalysis;

public interface IAnalysisBatchStore
{
    Task<string?> GetAsync(string gameId, string analysisMode, int engineDepth, CancellationToken cancellationToken);

    Task UpsertAsync(string gameId, string analysisMode, int engineDepth, string analysisPayloadJson, DateTimeOffset createdAtUtc, CancellationToken cancellationToken);
}
