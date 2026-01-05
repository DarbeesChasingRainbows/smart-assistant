using Microsoft.AspNetCore.Mvc;
using Retention.App.Contracts;
using Retention.Domain.Services;

namespace Retention.App.Controllers;

[ApiController]
[Route("api/v1/quiz/interleaved")]
public class InterleavedQuizController : ControllerBase
{
    private readonly IInterleavedQuizService _interleavedQuizService;

    public InterleavedQuizController(IInterleavedQuizService interleavedQuizService)
    {
        _interleavedQuizService = interleavedQuizService;
    }

    /// <summary>
    /// Creates an interleaved quiz session from multiple decks.
    /// Cards are shuffled across decks to prevent consecutive same-deck cards.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<InterleavedQuizResponse>> CreateInterleavedQuiz([FromBody] InterleavedQuizRequest request)
    {
        if (request.DeckIds == null || request.DeckIds.Count == 0)
        {
            return BadRequest("At least one deck must be selected");
        }

        try
        {
            var session = await _interleavedQuizService.CreateInterleavedSessionAsync(
                request.DeckIds,
                request.CardsPerDeck,
                request.Difficulty);

            var response = new InterleavedQuizResponse
            {
                Id = session.Id,
                Cards = session.Cards.Select(c => new InterleavedCardDto(
                    c.CardId, c.DeckId, c.DeckName, c.DeckCategory, c.PositionInSession)).ToList(),
                DeckInfos = session.DeckInfos.ToDictionary(
                    kvp => kvp.Key,
                    kvp => new DeckInfoDto(kvp.Value.Id, kvp.Value.Name, kvp.Value.Category, kvp.Value.CardCount)),
                Difficulty = session.Difficulty,
                TotalCards = session.TotalCards
            };

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
