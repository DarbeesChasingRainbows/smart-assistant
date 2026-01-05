import { define, url } from "../utils.ts";
import QuizInterface from "../islands/QuizInterface.tsx";
import FlashcardManager from "../islands/FlashcardManager.tsx";

export default define.page(function Home(_ctx) {
  return (
    <div class="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">

      {/* Navigation Header */}
      <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            {/* Logo */}
            <div class="flex items-center">
              <div class="shrink-0">
                <h1 class="text-2xl font-bold text-indigo-600">Flashcards</h1>
              </div>
            </div>

            {/* Navigation Links */}
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-8">
                <a href="#home" class="text-gray-900 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Home
                </a>
                <a href={url("/decks")} class="text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Decks
                </a>
                <a href={url("/graph")} class="text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Graph
                </a>
                <a href="#flashcards" class="text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Flashcards
                </a>
                <a href="#quiz" class="text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Practice Quiz
                </a>
                <a href="#features" class="text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Features
                </a>
              </div>
            </div>

            {/* CTA Button */}
            <div class="hidden md:block">
              <a
                href="#flashcards"
                class="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" class="py-20 px-4">
        <div class="max-w-7xl mx-auto text-center">
          <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Master Your Knowledge with
            <span class="text-indigo-600"> Smart Flashcards</span>
          </h1>
          <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your learning experience with intelligent spaced repetition, 
            Anki deck imports, and interactive quizzes. Build your knowledge base 
            and study smarter, not harder.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#flashcards"
              class="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Create Flashcards
            </a>
            <a
              href="#quiz"
              class="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-indigo-50 transition-all transform hover:scale-105"
            >
              Start Quiz
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" class="py-20 px-4 bg-white">
        <div class="max-w-7xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              Powerful Learning Features
            </h2>
            <p class="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to create, import, and master your flashcard collection
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div class="text-center p-8 rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-shadow">
              <div class="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 class="text-2xl font-semibold text-gray-900 mb-4">
                Easy Creation
              </h3>
              <p class="text-gray-600 leading-relaxed">
                Create flashcards individually with our intuitive form, or bulk import 
                multiple cards at once using simple text format.
              </p>
            </div>

            {/* Feature 2 */}
            <div class="text-center p-8 rounded-xl bg-linear-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-shadow">
              <div class="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 class="text-2xl font-semibold text-gray-900 mb-4">
                Anki Import
              </h3>
              <p class="text-gray-600 leading-relaxed">
                Seamlessly import your existing Anki decks (.apkg files) and continue 
                your learning journey without missing a beat.
              </p>
            </div>

            {/* Feature 3 */}
            <div class="text-center p-8 rounded-xl bg-linear-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
              <div class="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-2xl font-semibold text-gray-900 mb-4">
                Smart Quizzing
              </h3>
              <p class="text-gray-600 leading-relaxed">
                Test your knowledge with adaptive quizzes that adjust difficulty based 
                on your performance and learning progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flashcards Section */}
      <section id="flashcards" class="py-20 px-4">
        <div class="max-w-7xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              Manage Your Flashcards
            </h2>
            <p class="text-xl text-gray-600">
              Create, import, and organize your learning materials
            </p>
          </div>
          <FlashcardManager />
        </div>
      </section>

      {/* Quiz Section */}
      <section id="quiz" class="py-20 px-4 bg-white">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              Practice & Test Your Knowledge
            </h2>
            <p class="text-xl text-gray-600">
              Take interactive quizzes to reinforce your learning
            </p>
          </div>
          <QuizInterface />
        </div>
      </section>

      {/* Footer */}
      <footer class="bg-gray-900 text-white py-12 px-4">
        <div class="max-w-7xl mx-auto text-center">
          <h3 class="text-2xl font-bold mb-4">Flashcards</h3>
          <p class="text-gray-400 mb-8">
            Smart flashcard management with spaced repetition and interactive learning
          </p>
          <div class="flex justify-center space-x-8">
            <a href="#home" class="text-gray-400 hover:text-white transition-colors">
              Home
            </a>
            <a href="#flashcards" class="text-gray-400 hover:text-white transition-colors">
              Flashcards
            </a>
            <a href="#quiz" class="text-gray-400 hover:text-white transition-colors">
              Quiz
            </a>
            <a href="#features" class="text-gray-400 hover:text-white transition-colors">
              Features
            </a>
          </div>
          <div class="mt-8 pt-8 border-t border-gray-800 text-gray-500">
            <p>&copy; 2024 Flashcards. Built with Fresh, Deno, and .NET.</p>
          </div>
        </div>
      </footer>
    </div>
  );
});
