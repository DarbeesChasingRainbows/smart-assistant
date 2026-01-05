using Microsoft.AspNetCore.Mvc;
using Retention.App.Contracts;
using Retention.Domain;
using Retention.Domain.Entities;
using Retention.Domain.Repositories;

namespace Retention.App.Controllers;

[ApiController]
[Route("api/v1/flashcards/{flashcardId:guid}/versions")]
public class FlashcardVersionsController : ControllerBase
{
    private readonly IFlashcardVersionRepository _versionRepository;
    private readonly IFlashcardRepository _flashcardRepository;

    public FlashcardVersionsController(
        IFlashcardVersionRepository versionRepository,
        IFlashcardRepository flashcardRepository)
    {
        _versionRepository = versionRepository;
        _flashcardRepository = flashcardRepository;
    }

    /// <summary>
    /// Gets all versions of a flashcard.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FlashcardVersionDto>>> GetVersions(Guid flashcardId)
    {
        var versions = await _versionRepository.GetByFlashcardIdAsync(flashcardId);
        return Ok(versions.Select(FlashcardVersionDto.FromDomain));
    }

    /// <summary>
    /// Gets a specific version of a flashcard.
    /// </summary>
    [HttpGet("{versionId:guid}")]
    public async Task<ActionResult<FlashcardVersionDto>> GetVersion(Guid flashcardId, Guid versionId)
    {
        var version = await _versionRepository.GetByIdAsync(versionId);
        if (version is null || version.FlashcardId != flashcardId)
            return NotFound();

        return Ok(FlashcardVersionDto.FromDomain(version));
    }

    /// <summary>
    /// Restores a flashcard to a previous version.
    /// </summary>
    [HttpPost("{versionId:guid}/restore")]
    public async Task<ActionResult> RestoreVersion(Guid flashcardId, Guid versionId)
    {
        var version = await _versionRepository.GetByIdAsync(versionId);
        if (version is null || version.FlashcardId != flashcardId)
            return NotFound("Version not found");

        var flashcard = await _flashcardRepository.GetByIdAsync(flashcardId);
        if (flashcard is null)
            return NotFound("Flashcard not found");

        // Save current state as a new version before restoring
        var nextVersionNumber = await _versionRepository.GetNextVersionNumberAsync(flashcardId);
        var currentVersion = FlashcardVersion.CreateFromFlashcard(flashcard, nextVersionNumber, "Auto-saved before restore");
        await _versionRepository.AddAsync(currentVersion);

        // Restore the flashcard to the selected version
        flashcard.UpdateContent(version.Question, version.Answer);
        await _flashcardRepository.UpdateAsync(flashcard);

        return Ok(new { message = "Flashcard restored to version " + version.VersionNumber });
    }
}
