using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ChessMate.Infrastructure.BatchCoach;

public sealed class CanonicalRequestHashProvider : IRequestHashProvider
{
    public string ComputePayloadHash(string payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return ComputeSha256Hex(string.Empty);
        }

        using var document = JsonDocument.Parse(payload);
        var canonicalJson = BuildCanonicalJson(document.RootElement);
        return ComputeSha256Hex(canonicalJson);
    }

    public string ComputeOperationId(string idempotencyKey, string payloadHash)
    {
        var material = $"{idempotencyKey}:{payloadHash}";
        return ComputeSha256Hex(material);
    }

    private static string BuildCanonicalJson(JsonElement element)
    {
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream))
        {
            WriteCanonicalElement(writer, element);
        }

        return Encoding.UTF8.GetString(stream.ToArray());
    }

    private static void WriteCanonicalElement(Utf8JsonWriter writer, JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartObject();
                foreach (var property in element.EnumerateObject().OrderBy(property => property.Name, StringComparer.Ordinal))
                {
                    writer.WritePropertyName(property.Name);
                    WriteCanonicalElement(writer, property.Value);
                }

                writer.WriteEndObject();
                break;

            case JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray())
                {
                    WriteCanonicalElement(writer, item);
                }

                writer.WriteEndArray();
                break;

            default:
                element.WriteTo(writer);
                break;
        }
    }

    private static string ComputeSha256Hex(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}