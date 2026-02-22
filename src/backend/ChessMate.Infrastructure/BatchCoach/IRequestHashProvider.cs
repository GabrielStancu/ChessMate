namespace ChessMate.Infrastructure.BatchCoach;

public interface IRequestHashProvider
{
    string ComputePayloadHash(string payload);

    string ComputeOperationId(string idempotencyKey, string payloadHash);
}