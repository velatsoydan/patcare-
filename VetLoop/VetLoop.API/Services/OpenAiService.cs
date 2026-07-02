using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VetLoop.API.DTOs.Ai;

namespace VetLoop.API.Services;

public sealed class OpenAiService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OpenAiService> _logger;
    private readonly string? _apiKey;

    public OpenAiService(HttpClient httpClient, IConfiguration configuration, ILogger<OpenAiService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["OpenAi:ApiKey"];
    }

    public async Task<DiagnosticResponseDto> DiagnoseSymptomsAsync(
        string petName,
        string species,
        string breed,
        string gender,
        decimal weightKg,
        string symptoms,
        string duration,
        string? extraNotes,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey == "YOUR_OPENAI_API_KEY")
        {
            _logger.LogWarning("OpenAI API Key is not configured. Throwing configuration exception.");
            throw new InvalidOperationException("OpenAI API Key is not configured. Please add 'OpenAi:ApiKey' in appsettings.json or set the OPENAI_API_KEY environment variable.");
        }

        var requestBody = new
        {
            model = "gpt-4o-mini",
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = "You are a professional veterinary assistant. Analyze the symptoms of the pet and respond with a JSON object. " +
                              "The response must follow this EXACT JSON structure:\n" +
                              "{\n" +
                              "  \"possibleConditions\": [\"Condition A\", \"Condition B\"],\n" +
                              "  \"recommendations\": [\"Recommendation A\", \"Recommendation B\"],\n" +
                              "  \"urgencyLevel\": \"Critical\" | \"Warning\" | \"Info\"\n" +
                              "}\n" +
                              "Do not wrap in markdown code blocks like ```json ... ```. Just return raw JSON."
                },
                new
                {
                    role = "user",
                    content = $"Pet: {petName} ({species}, {breed}, {gender}, {weightKg}kg)\n" +
                              $"Symptoms: {symptoms}\n" +
                              $"Duration: {duration}\n" +
                              $"Extra Notes: {extraNotes ?? "None"}"
                }
            },
            response_format = new { type = "json_object" }
        };

        var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
        {
            Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        };
        requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        var response = await _httpClient.SendAsync(requestMessage, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("OpenAI API request failed: {StatusCode} - {Error}", response.StatusCode, errorContent);
            throw new HttpRequestException($"OpenAI API request failed with status code {response.StatusCode}: {errorContent}");
        }

        var responseContent = await response.Content.ReadAsStringAsync(ct);
        using var document = JsonDocument.Parse(responseContent);
        var chatChoice = document.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

        if (string.IsNullOrWhiteSpace(chatChoice))
        {
            throw new InvalidOperationException("OpenAI returned an empty content response.");
        }

        // Clean any markdown formatting if present
        var cleanedJson = chatChoice.Trim();
        if (cleanedJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            cleanedJson = cleanedJson[7..];
        }
        if (cleanedJson.EndsWith("```"))
        {
            cleanedJson = cleanedJson[..^3];
        }
        cleanedJson = cleanedJson.Trim();

        var aiResponse = JsonSerializer.Deserialize<OpenAiResponseTemplate>(cleanedJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? throw new InvalidOperationException("Failed to deserialize OpenAI response template.");

        return new DiagnosticResponseDto(
            aiResponse.PossibleConditions ?? new List<string>(),
            aiResponse.Recommendations ?? new List<string>(),
            aiResponse.UrgencyLevel ?? "Info"
        );
    }

    private sealed class OpenAiResponseTemplate
    {
        public List<string>? PossibleConditions { get; set; }
        public List<string>? Recommendations { get; set; }
        public string? UrgencyLevel { get; set; }
    }
}
