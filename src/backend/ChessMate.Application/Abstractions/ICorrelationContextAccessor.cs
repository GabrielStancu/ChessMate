namespace ChessMate.Application.Abstractions;

public interface ICorrelationContextAccessor
{
    string CorrelationId { get; set; }
}