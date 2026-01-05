using Microsoft.AspNetCore.Mvc;
using Retention.App.Contracts;
using Retention.Domain;

namespace Retention.App.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class GlossaryController : ControllerBase
{
    private readonly IGlossaryRepository _glossaryRepository;

    public GlossaryController(IGlossaryRepository glossaryRepository)
    {
        _glossaryRepository = glossaryRepository;
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<GlossaryTermDto>>> SearchTerms([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return BadRequest("Query is required");
        
        var terms = await _glossaryRepository.SearchTermsAsync(query);
        return Ok(terms.Select(GlossaryTermDto.FromDomain));
    }
    
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GlossaryTermDto>> GetTerm(Guid id)
    {
        var term = await _glossaryRepository.GetByIdAsync(id);
        if (term == null) return NotFound();
        return Ok(GlossaryTermDto.FromDomain(term));
    }

    [HttpGet("flashcard/{flashcardId:guid}")]
    public async Task<ActionResult<IEnumerable<GlossaryTermDto>>> GetTermsForFlashcard(Guid flashcardId)
    {
        var terms = await _glossaryRepository.GetForFlashcardAsync(flashcardId);
        return Ok(terms.Select(GlossaryTermDto.FromDomain));
    }
}
