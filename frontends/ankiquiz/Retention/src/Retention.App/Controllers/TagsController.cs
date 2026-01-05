using Microsoft.AspNetCore.Mvc;
using Retention.App.Contracts;
using Retention.Domain.Entities;
using Retention.Domain.Repositories;

namespace Retention.App.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class TagsController : ControllerBase
{
    private readonly ITagRepository _tagRepository;

    public TagsController(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TagDto>>> GetAllTags()
    {
        var tags = await _tagRepository.GetAllAsync();
        return Ok(tags.Select(TagDto.FromDomain));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TagDto>> GetTag(Guid id)
    {
        var tag = await _tagRepository.GetByIdAsync(id);
        if (tag is null) return NotFound();
        return Ok(TagDto.FromDomain(tag));
    }

    [HttpPost]
    public async Task<ActionResult<TagDto>> CreateTag([FromBody] CreateTagRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Tag name is required");
        }

        // Check if tag already exists
        var existing = await _tagRepository.GetByNameAsync(request.Name);
        if (existing != null)
        {
            return Ok(TagDto.FromDomain(existing));
        }

        var tag = Tag.Create(request.Name, request.Color);
        await _tagRepository.AddAsync(tag);

        return CreatedAtAction(nameof(GetTag), new { id = tag.Id }, TagDto.FromDomain(tag));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteTag(Guid id)
    {
        var tag = await _tagRepository.GetByIdAsync(id);
        if (tag is null) return NotFound();

        await _tagRepository.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("flashcard/{flashcardId:guid}")]
    public async Task<ActionResult<IEnumerable<TagDto>>> GetTagsForFlashcard(Guid flashcardId)
    {
        var tags = await _tagRepository.GetByFlashcardIdAsync(flashcardId);
        return Ok(tags.Select(TagDto.FromDomain));
    }

    [HttpPost("flashcard/{flashcardId:guid}/tag/{tagId:guid}")]
    public async Task<ActionResult> AddTagToFlashcard(Guid flashcardId, Guid tagId)
    {
        await _tagRepository.AddTagToFlashcardAsync(flashcardId, tagId);
        return NoContent();
    }

    [HttpDelete("flashcard/{flashcardId:guid}/tag/{tagId:guid}")]
    public async Task<ActionResult> RemoveTagFromFlashcard(Guid flashcardId, Guid tagId)
    {
        await _tagRepository.RemoveTagFromFlashcardAsync(flashcardId, tagId);
        return NoContent();
    }
}
