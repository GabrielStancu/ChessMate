namespace ChessMate.Infrastructure.BatchCoach;

public interface IAnalysisBatchStore
{
    Task UpsertAsync(AnalysisBatchArtifact artifact, CancellationToken cancellationToken);
}