namespace ChessMate.Infrastructure.BatchCoach;

public static class OperationStateStatus
{
    public const string Running = "Running";
    public const string Completed = "Completed";
    public const string Failed = "Failed";
    public const string PartialCoaching = "PartialCoaching";

    public static bool IsTerminal(string status)
    {
        return status is Completed or Failed or PartialCoaching;
    }
}