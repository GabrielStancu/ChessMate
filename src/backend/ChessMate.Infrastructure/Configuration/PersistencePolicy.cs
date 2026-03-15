namespace ChessMate.Infrastructure.Configuration;

public static class PersistencePolicy
{
    public const string SchemaVersion = "v3";

    public static readonly TimeSpan RetentionWindow = TimeSpan.FromDays(30);

    public static DateTimeOffset CalculateExpiresAtUtc(DateTimeOffset createdAtUtc)
    {
        return createdAtUtc.Add(RetentionWindow);
    }
}