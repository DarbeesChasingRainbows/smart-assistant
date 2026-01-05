using Microsoft.AspNetCore.Mvc;
using Retention.App.Contracts;
using Retention.Domain;
using Retention.Domain.Entities;

namespace Retention.App.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class DecksController : ControllerBase
{
    private readonly IDeckRepository _deckRepository;
    private readonly ICrossReferenceRepository _crossReferenceRepository;

    public DecksController(IDeckRepository deckRepository, ICrossReferenceRepository crossReferenceRepository)
    {
        _deckRepository = deckRepository;
        _crossReferenceRepository = crossReferenceRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DeckDto>>> GetDecks(
        [FromQuery] string? category = null,
        [FromQuery] string? subcategory = null)
    {
        var decks = string.IsNullOrEmpty(category) 
            ? await _deckRepository.GetAllAsync()
            : await _deckRepository.GetByCategoryAsync(category, subcategory);
            
        return Ok(decks.Select(DeckDto.FromDomain));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DeckDto>> GetDeck(Guid id)
    {
        var deck = await _deckRepository.GetByIdAsync(id);
        if (deck is null) return NotFound();
        return Ok(DeckDto.FromDomain(deck));
    }
    
    [HttpGet("{id:guid}/cross-references")]
    public async Task<ActionResult<IEnumerable<CrossReferenceDto>>> GetCrossReferences(Guid id)
    {
        var references = await _crossReferenceRepository.GetBySourceAsync(id, "deck");
        return Ok(references.Select(CrossReferenceDto.FromDomain));
    }

    [HttpGet("{id:guid}/backlinks")]
    public async Task<ActionResult<IEnumerable<CrossReferenceDto>>> GetBacklinks(Guid id)
    {
        var references = await _crossReferenceRepository.GetByTargetAsync(id, "deck");
        return Ok(references.Select(CrossReferenceDto.FromDomain));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DeckDto>> UpdateDeck(Guid id, [FromBody] UpdateDeckRequest request)
    {
        var deck = await _deckRepository.GetByIdAsync(id);
        if (deck is null) return NotFound();

        if (!Enum.TryParse<DifficultyLevel>(request.DifficultyLevel, true, out var difficulty))
        {
            return BadRequest($"Invalid difficulty: {request.DifficultyLevel}. Valid values are: Beginner, Intermediate, Advanced, Expert");
        }

        deck.Update(request.Name, request.Description, request.Category, request.Subcategory, difficulty);
        await _deckRepository.UpdateAsync(deck);

        return Ok(DeckDto.FromDomain(deck));
    }

    /// <summary>
    /// Generates a shareable link for the deck.
    /// </summary>
    [HttpPost("{id:guid}/share")]
    public async Task<ActionResult<ShareDeckResponse>> ShareDeck(Guid id)
    {
        var deck = await _deckRepository.GetByIdAsync(id);
        if (deck is null) return NotFound();

        var token = deck.GenerateShareToken();
        await _deckRepository.UpdateAsync(deck);

        return Ok(new ShareDeckResponse
        {
            ShareToken = token,
            ShareUrl = $"/shared/{token}"
        });
    }

    /// <summary>
    /// Revokes the share link for the deck.
    /// </summary>
    [HttpDelete("{id:guid}/share")]
    public async Task<ActionResult> RevokeShare(Guid id)
    {
        var deck = await _deckRepository.GetByIdAsync(id);
        if (deck is null) return NotFound();

        deck.RevokeShareToken();
        await _deckRepository.UpdateAsync(deck);

        return NoContent();
    }

    /// <summary>
    /// Gets a deck by its share token (public access).
    /// </summary>
    [HttpGet("shared/{token}")]
    public async Task<ActionResult<DeckDto>> GetSharedDeck(string token)
    {
        var deck = await _deckRepository.GetByShareTokenAsync(token);
        if (deck is null) return NotFound();

        return Ok(DeckDto.FromDomain(deck));
    }

    /// <summary>
    /// Clones a shared deck into the user's collection.
    /// </summary>
    [HttpPost("shared/{token}/clone")]
    public async Task<ActionResult<DeckDto>> CloneSharedDeck(string token, [FromBody] CloneDeckRequest? request = null)
    {
        var sourceDeck = await _deckRepository.GetByShareTokenAsync(token);
        if (sourceDeck is null) return NotFound("Shared deck not found");

        // Create a new deck with the same content
        var newName = request?.NewName ?? $"{sourceDeck.Name} (Copy)";
        var newDeck = new Deck(
            Guid.CreateVersion7(),
            newName,
            sourceDeck.Description,
            sourceDeck.Category,
            sourceDeck.Subcategory,
            sourceDeck.DifficultyLevel
        );

        await _deckRepository.AddAsync(newDeck);

        // Clone all flashcards from the source deck
        foreach (var flashcard in sourceDeck.Flashcards)
        {
            var newFlashcard = Flashcard.CreateNew(
                flashcard.Question,
                flashcard.Answer,
                newDeck.Id,
                flashcard.Metadata
            );
            newDeck.AddFlashcard(newFlashcard);
        }

        return CreatedAtAction(nameof(GetDeck), new { id = newDeck.Id }, DeckDto.FromDomain(newDeck));
    }
}
