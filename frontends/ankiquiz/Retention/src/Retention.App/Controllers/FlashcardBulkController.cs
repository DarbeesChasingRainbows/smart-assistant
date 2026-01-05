using Microsoft.AspNetCore.Mvc;
using Retention.Domain;
using Retention.Domain.Entities;

namespace Retention.App.Controllers;

/// <summary>
/// Controller for bulk flashcard operations: move, copy, and merge.
/// </summary>
[ApiController]
[Route("api/v1/flashcards/bulk")]
public class FlashcardBulkController : ControllerBase
{
    private readonly IFlashcardRepository _flashcardRepository;
    private readonly IDeckRepository _deckRepository;

    public FlashcardBulkController(IFlashcardRepository flashcardRepository, IDeckRepository deckRepository)
    {
        _flashcardRepository = flashcardRepository;
        _deckRepository = deckRepository;
    }

    /// <summary>
    /// Moves flashcards from one deck to another.
    /// </summary>
    [HttpPost("move")]
    public async Task<ActionResult<BulkOperationResult>> MoveFlashcards([FromBody] BulkMoveRequest request)
    {
        if (request.FlashcardIds == null || request.FlashcardIds.Count == 0)
            return BadRequest("No flashcards specified");

        var targetDeck = await _deckRepository.GetByIdAsync(request.TargetDeckId);
        if (targetDeck is null)
            return NotFound("Target deck not found");

        var movedCount = 0;
        var errors = new List<string>();

        foreach (var cardId in request.FlashcardIds)
        {
            try
            {
                var card = await _flashcardRepository.GetByIdAsync(cardId);
                if (card is null)
                {
                    errors.Add($"Card {cardId} not found");
                    continue;
                }

                // Create new card in target deck and delete old one
                var newCard = Flashcard.CreateNew(card.Question, card.Answer, request.TargetDeckId, card.Metadata);
                await _flashcardRepository.AddAsync(newCard);
                await _flashcardRepository.DeleteAsync(cardId);
                movedCount++;
            }
            catch (Exception ex)
            {
                errors.Add($"Failed to move card {cardId}: {ex.Message}");
            }
        }

        return Ok(new BulkOperationResult
        {
            SuccessCount = movedCount,
            FailedCount = errors.Count,
            Errors = errors
        });
    }

    /// <summary>
    /// Copies flashcards to another deck (keeps originals).
    /// </summary>
    [HttpPost("copy")]
    public async Task<ActionResult<BulkOperationResult>> CopyFlashcards([FromBody] BulkCopyRequest request)
    {
        if (request.FlashcardIds == null || request.FlashcardIds.Count == 0)
            return BadRequest("No flashcards specified");

        var targetDeck = await _deckRepository.GetByIdAsync(request.TargetDeckId);
        if (targetDeck is null)
            return NotFound("Target deck not found");

        var copiedCount = 0;
        var errors = new List<string>();

        foreach (var cardId in request.FlashcardIds)
        {
            try
            {
                var card = await _flashcardRepository.GetByIdAsync(cardId);
                if (card is null)
                {
                    errors.Add($"Card {cardId} not found");
                    continue;
                }

                var newCard = Flashcard.CreateNew(card.Question, card.Answer, request.TargetDeckId, card.Metadata);
                await _flashcardRepository.AddAsync(newCard);
                copiedCount++;
            }
            catch (Exception ex)
            {
                errors.Add($"Failed to copy card {cardId}: {ex.Message}");
            }
        }

        return Ok(new BulkOperationResult
        {
            SuccessCount = copiedCount,
            FailedCount = errors.Count,
            Errors = errors
        });
    }

    /// <summary>
    /// Merges all cards from source deck into target deck.
    /// Optionally deletes the source deck after merge.
    /// </summary>
    [HttpPost("merge")]
    public async Task<ActionResult<BulkOperationResult>> MergeDecks([FromBody] MergeDecksRequest request)
    {
        var sourceDeck = await _deckRepository.GetByIdAsync(request.SourceDeckId);
        if (sourceDeck is null)
            return NotFound("Source deck not found");

        var targetDeck = await _deckRepository.GetByIdAsync(request.TargetDeckId);
        if (targetDeck is null)
            return NotFound("Target deck not found");

        var sourceCards = await _flashcardRepository.GetByDeckIdAsync(request.SourceDeckId);
        var mergedCount = 0;
        var errors = new List<string>();

        foreach (var card in sourceCards)
        {
            try
            {
                var newCard = Flashcard.CreateNew(card.Question, card.Answer, request.TargetDeckId, card.Metadata);
                await _flashcardRepository.AddAsync(newCard);
                await _flashcardRepository.DeleteAsync(card.Id);
                mergedCount++;
            }
            catch (Exception ex)
            {
                errors.Add($"Failed to merge card {card.Id}: {ex.Message}");
            }
        }

        // Optionally delete the source deck
        if (request.DeleteSourceDeck && errors.Count == 0)
        {
            await _deckRepository.DeleteAsync(request.SourceDeckId);
        }

        return Ok(new BulkOperationResult
        {
            SuccessCount = mergedCount,
            FailedCount = errors.Count,
            Errors = errors,
            Message = request.DeleteSourceDeck && errors.Count == 0 
                ? "Decks merged and source deck deleted" 
                : "Cards merged successfully"
        });
    }

    /// <summary>
    /// Deletes multiple flashcards at once.
    /// </summary>
    [HttpPost("delete")]
    public async Task<ActionResult<BulkOperationResult>> DeleteFlashcards([FromBody] BulkDeleteRequest request)
    {
        if (request.FlashcardIds == null || request.FlashcardIds.Count == 0)
            return BadRequest("No flashcards specified");

        var deletedCount = 0;
        var errors = new List<string>();

        foreach (var cardId in request.FlashcardIds)
        {
            try
            {
                await _flashcardRepository.DeleteAsync(cardId);
                deletedCount++;
            }
            catch (Exception ex)
            {
                errors.Add($"Failed to delete card {cardId}: {ex.Message}");
            }
        }

        return Ok(new BulkOperationResult
        {
            SuccessCount = deletedCount,
            FailedCount = errors.Count,
            Errors = errors
        });
    }
}

public record BulkMoveRequest(List<Guid> FlashcardIds, Guid TargetDeckId);
public record BulkCopyRequest(List<Guid> FlashcardIds, Guid TargetDeckId);
public record BulkDeleteRequest(List<Guid> FlashcardIds);
public record MergeDecksRequest(Guid SourceDeckId, Guid TargetDeckId, bool DeleteSourceDeck = false);

public class BulkOperationResult
{
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public string? Message { get; set; }
}
