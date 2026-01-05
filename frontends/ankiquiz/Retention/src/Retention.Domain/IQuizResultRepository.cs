using Retention.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Retention.Domain;

public interface IQuizResultRepository
{
    Task AddAsync(QuizResult result);
    Task<IEnumerable<QuizResult>> GetByUserIdAsync(string userId, int limit = 100);
    Task<IEnumerable<QuizResult>> GetByDeckIdAsync(Guid deckId, int limit = 100);
}
