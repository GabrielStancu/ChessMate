using ChessMate.Application.Validation;
using ChessMate.Functions.Http;
using ChessMate.Functions.Validation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Functions;

public sealed class AnalysisFunctions(HttpResponseFactory responseFactory, ILogger<AnalysisFunctions> logger)
{
    [Function("BatchCoach")]
    public async Task<HttpResponseData> BatchCoachAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "api/analysis/batch-coach")]
        HttpRequestData request)
    {
        var payload = await new StreamReader(request.Body).ReadToEndAsync();

        try
        {
            RequestValidators.ValidateBatchCoachRequest(payload);
        }
        catch (RequestValidationException exception)
        {
            logger.LogWarning(exception, "POST batch-coach request validation failed.");
            return await responseFactory.CreateValidationErrorAsync(request, exception);
        }

        logger.LogInformation("POST batch-coach placeholder reached with payload length {PayloadLength}.", payload.Length);

        return await responseFactory.CreateNotImplementedAsync(request);
    }
}