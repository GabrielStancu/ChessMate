namespace ChessMate.Infrastructure.Configuration;

public static class PersistencePolicy
{
    public const string SchemaVersion = "v1";

    public static readonly TimeSpan RetentionWindow = TimeSpan.FromDays(30);

    public static DateTimeOffset CalculateExpiresAtUtc(DateTimeOffset createdAtUtc)
    {
        return createdAtUtc.Add(RetentionWindow);
    }
}