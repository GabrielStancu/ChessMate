using System.Text.Json;
using Azure;
using Azure.Data.Tables;

namespace ChessMate.Infrastructure.BatchAnalysis;

public sealed class AnalysisBatchEntity : ITableEntity
{
    /// <summary>Number of classified moves (plies) stored per table column.</summary>
    /// <remarks>4 × ~600 chars ≈ 2,400 chars per column — well within Azure Table Storage's 32,767-char limit.</remarks>
    internal const int MovesPerChunk = 4;

    /// <summary>Maximum move columns. 40 × 4 = 160 plies (80 full moves), covering virtually all real games.</summary>
    internal const int MaxMoveChunks = 40;

    public string PartitionKey { get; set; } = string.Empty;

    public string RowKey { get; set; } = string.Empty;

    public DateTimeOffset? Timestamp { get; set; }

    public ETag ETag { get; set; }

    public string GameId { get; set; } = string.Empty;

    public string AnalysisMode { get; set; } = string.Empty;

    public int EngineDepth { get; set; }

    /// <summary>Number of populated move chunk columns.</summary>
    public int MoveChunkCount { get; set; }

    /// <summary>JSON object containing all result fields except <c>classifiedMoves</c>.</summary>
    public string AnalysisHeader { get; set; } = string.Empty;

    // 40 columns × 4 moves each = 160 plies (80 full moves)
    public string MoveChunk0 { get; set; } = string.Empty;
    public string MoveChunk1 { get; set; } = string.Empty;
    public string MoveChunk2 { get; set; } = string.Empty;
    public string MoveChunk3 { get; set; } = string.Empty;
    public string MoveChunk4 { get; set; } = string.Empty;
    public string MoveChunk5 { get; set; } = string.Empty;
    public string MoveChunk6 { get; set; } = string.Empty;
    public string MoveChunk7 { get; set; } = string.Empty;
    public string MoveChunk8 { get; set; } = string.Empty;
    public string MoveChunk9 { get; set; } = string.Empty;
    public string MoveChunk10 { get; set; } = string.Empty;
    public string MoveChunk11 { get; set; } = string.Empty;
    public string MoveChunk12 { get; set; } = string.Empty;
    public string MoveChunk13 { get; set; } = string.Empty;
    public string MoveChunk14 { get; set; } = string.Empty;
    public string MoveChunk15 { get; set; } = string.Empty;
    public string MoveChunk16 { get; set; } = string.Empty;
    public string MoveChunk17 { get; set; } = string.Empty;
    public string MoveChunk18 { get; set; } = string.Empty;
    public string MoveChunk19 { get; set; } = string.Empty;
    public string MoveChunk20 { get; set; } = string.Empty;
    public string MoveChunk21 { get; set; } = string.Empty;
    public string MoveChunk22 { get; set; } = string.Empty;
    public string MoveChunk23 { get; set; } = string.Empty;
    public string MoveChunk24 { get; set; } = string.Empty;
    public string MoveChunk25 { get; set; } = string.Empty;
    public string MoveChunk26 { get; set; } = string.Empty;
    public string MoveChunk27 { get; set; } = string.Empty;
    public string MoveChunk28 { get; set; } = string.Empty;
    public string MoveChunk29 { get; set; } = string.Empty;
    public string MoveChunk30 { get; set; } = string.Empty;
    public string MoveChunk31 { get; set; } = string.Empty;
    public string MoveChunk32 { get; set; } = string.Empty;
    public string MoveChunk33 { get; set; } = string.Empty;
    public string MoveChunk34 { get; set; } = string.Empty;
    public string MoveChunk35 { get; set; } = string.Empty;
    public string MoveChunk36 { get; set; } = string.Empty;
    public string MoveChunk37 { get; set; } = string.Empty;
    public string MoveChunk38 { get; set; } = string.Empty;
    public string MoveChunk39 { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset ExpiresAtUtc { get; set; }

    public string SchemaVersion { get; set; } = "v3";

    /// <summary>Reassemble the header and move chunks into the original JSON string.</summary>
    public string GetPayload()
    {
        if (string.IsNullOrEmpty(AnalysisHeader))
            return string.Empty;

        var moveChunks = new[]
        {
            MoveChunk0,  MoveChunk1,  MoveChunk2,  MoveChunk3,  MoveChunk4,
            MoveChunk5,  MoveChunk6,  MoveChunk7,  MoveChunk8,  MoveChunk9,
            MoveChunk10, MoveChunk11, MoveChunk12, MoveChunk13, MoveChunk14,
            MoveChunk15, MoveChunk16, MoveChunk17, MoveChunk18, MoveChunk19,
            MoveChunk20, MoveChunk21, MoveChunk22, MoveChunk23, MoveChunk24,
            MoveChunk25, MoveChunk26, MoveChunk27, MoveChunk28, MoveChunk29,
            MoveChunk30, MoveChunk31, MoveChunk32, MoveChunk33, MoveChunk34,
            MoveChunk35, MoveChunk36, MoveChunk37, MoveChunk38, MoveChunk39
        };

        using var ms = new System.IO.MemoryStream();
        using var writer = new Utf8JsonWriter(ms);

        writer.WriteStartObject();

        using (var headerDoc = JsonDocument.Parse(AnalysisHeader))
        {
            foreach (var prop in headerDoc.RootElement.EnumerateObject())
                prop.WriteTo(writer);
        }

        writer.WritePropertyName("classifiedMoves");
        writer.WriteStartArray();

        for (var i = 0; i < MoveChunkCount; i++)
        {
            var chunk = moveChunks[i];
            if (string.IsNullOrEmpty(chunk))
                break;

            using var chunkDoc = JsonDocument.Parse(chunk);
            foreach (var move in chunkDoc.RootElement.EnumerateArray())
                move.WriteTo(writer);
        }

        writer.WriteEndArray();
        writer.WriteEndObject();
        writer.Flush();

        return System.Text.Encoding.UTF8.GetString(ms.ToArray());
    }

    /// <summary>Split a JSON payload into a header column and move columns of <see cref="MovesPerChunk"/> plies each.</summary>
    public void SetPayload(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!root.TryGetProperty("classifiedMoves", out var movesElement))
        {
            AnalysisHeader = json;
            MoveChunkCount = 0;
            return;
        }

        using var headerMs = new System.IO.MemoryStream();
        using (var headerWriter = new Utf8JsonWriter(headerMs))
        {
            headerWriter.WriteStartObject();
            foreach (var prop in root.EnumerateObject())
            {
                if (prop.Name != "classifiedMoves")
                    prop.WriteTo(headerWriter);
            }
            headerWriter.WriteEndObject();
        }
        AnalysisHeader = System.Text.Encoding.UTF8.GetString(headerMs.ToArray());

        var moves = movesElement.EnumerateArray().ToArray();
        var chunkCount = (moves.Length + MovesPerChunk - 1) / MovesPerChunk;

        if (chunkCount > MaxMoveChunks)
        {
            throw new InvalidOperationException(
                $"Game has {moves.Length} plies ({chunkCount} chunks required), exceeding the maximum of {MaxMoveChunks} chunks ({MaxMoveChunks * MovesPerChunk} plies).");
        }

        MoveChunkCount = chunkCount;

        var setters = new Action<string>[]
        {
            v => MoveChunk0 = v,  v => MoveChunk1 = v,  v => MoveChunk2 = v,
            v => MoveChunk3 = v,  v => MoveChunk4 = v,  v => MoveChunk5 = v,
            v => MoveChunk6 = v,  v => MoveChunk7 = v,  v => MoveChunk8 = v,
            v => MoveChunk9 = v,  v => MoveChunk10 = v, v => MoveChunk11 = v,
            v => MoveChunk12 = v, v => MoveChunk13 = v, v => MoveChunk14 = v,
            v => MoveChunk15 = v, v => MoveChunk16 = v, v => MoveChunk17 = v,
            v => MoveChunk18 = v, v => MoveChunk19 = v, v => MoveChunk20 = v,
            v => MoveChunk21 = v, v => MoveChunk22 = v, v => MoveChunk23 = v,
            v => MoveChunk24 = v, v => MoveChunk25 = v, v => MoveChunk26 = v,
            v => MoveChunk27 = v, v => MoveChunk28 = v, v => MoveChunk29 = v,
            v => MoveChunk30 = v, v => MoveChunk31 = v, v => MoveChunk32 = v,
            v => MoveChunk33 = v, v => MoveChunk34 = v, v => MoveChunk35 = v,
            v => MoveChunk36 = v, v => MoveChunk37 = v, v => MoveChunk38 = v,
            v => MoveChunk39 = v
        };

        for (var i = 0; i < MaxMoveChunks; i++)
        {
            if (i < chunkCount)
            {
                var start = i * MovesPerChunk;
                var group = moves.Skip(start).Take(MovesPerChunk);
                setters[i](JsonSerializer.Serialize(group));
            }
            else
            {
                setters[i](string.Empty);
            }
        }
    }
}
