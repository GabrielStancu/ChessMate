using System.Net;

namespace ChessMate.Functions.BatchCoach;

public static class BatchCoachFailureCodes
{
    public const string ValidationError = "ValidationError";
    public const string RateLimited = "RateLimited";
    public const string UpstreamUnavailable = "UpstreamUnavailable";
    public const string Timeout = "Timeout";
    public const string OrchestrationFailed = "OrchestrationFailed";
    public const string PartialCoaching = "PartialCoaching";
}

public static class BatchCoachFailureCodeMapper
{
    public static string Map(Exception exception)
    {
        if (exception is TaskCanceledException)
        {
            return BatchCoachFailureCodes.Timeout;
        }

        if (exception is HttpRequestException httpRequestException)
        {
            return MapHttpStatusCode(httpRequestException.StatusCode);
        }

        return BatchCoachFailureCodes.UpstreamUnavailable;
    }

    public static string MapHttpStatusCode(HttpStatusCode? statusCode)
    {
        if (statusCode is null)
        {
            return BatchCoachFailureCodes.UpstreamUnavailable;
        }

        return statusCode.Value switch
        {
            HttpStatusCode.TooManyRequests => BatchCoachFailureCodes.RateLimited,
            HttpStatusCode.RequestTimeout => BatchCoachFailureCodes.Timeout,
            HttpStatusCode.GatewayTimeout => BatchCoachFailureCodes.Timeout,
            HttpStatusCode.BadGateway => BatchCoachFailureCodes.UpstreamUnavailable,
            HttpStatusCode.ServiceUnavailable => BatchCoachFailureCodes.UpstreamUnavailable,
            HttpStatusCode.InternalServerError => BatchCoachFailureCodes.UpstreamUnavailable,
            _ => BatchCoachFailureCodes.UpstreamUnavailable
        };
    }
}