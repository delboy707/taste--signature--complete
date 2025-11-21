// ===== NEED STATE QUESTIONNAIRE =====
const needStateQuestions = [
    {
        id: 1,
        question: "When would this product most likely be consumed?",
        options: [
            { text: "During a special occasion or celebration", scores: { reward: 3, sociability: 2 } },
            { text: "During a break or downtime", scores: { escape: 3, rejuvenation: 1 } },
            { text: "When needing an energy boost", scores: { rejuvenation: 3, reward: 1 } },
            { text: "When sharing with friends or family", scores: { sociability: 3, reward: 1 } }
        ]
    },
    {
        id: 2,
        question: "What emotional benefit does this product deliver?",
        options: [
            { text: "Makes me feel pampered and special", scores: { reward: 3, escape: 1 } },
            { text: "Helps me unwind and relax", scores: { escape: 3, rejuvenation: 1 } },
            { text: "Gives me energy and vitality", scores: { rejuvenation: 3 } },
            { text: "Brings people together", scores: { sociability: 3 } }
        ]
    },
    {
        id: 3,
        question: "How would you describe the consumption experience?",
        options: [
            { text: "Indulgent and luxurious", scores: { reward: 3, escape: 1 } },
            { text: "Comforting and soothing", scores: { escape: 3 } },
            { text: "Refreshing and invigorating", scores: { rejuvenation: 3 } },
            { text: "Fun and interactive", scores: { sociability: 3, reward: 1 } }
        ]
    },
    {
        id: 4,
        question: "What is the primary purpose of this product?",
        options: [
            { text: "To treat myself to something special", scores: { reward: 3 } },
            { text: "To escape from daily stress", scores: { escape: 3 } },
            { text: "To recharge and revitalize", scores: { rejuvenation: 3 } },
            { text: "To enhance social moments", scores: { sociability: 3 } }
        ]
    },
    {
        id: 5,
        question: "How often would this product typically be consumed?",
        options: [
            { text: "Rarely - it's a special treat", scores: { reward: 3 } },
            { text: "Occasionally when I need a break", scores: { escape: 2, rejuvenation: 1 } },
            { text: "Regularly as part of my routine", scores: { rejuvenation: 2, escape: 1 } },
            { text: "Socially with others", scores: { sociability: 3 } }
        ]
    }
];

const needStateProfiles = {
    reward: {
        name: "Reward",
        icon: "🎁",
        description: "Products consumed as a special treat or indulgence. These deliver pleasure, satisfaction, and a sense of being pampered.",
        characteristics: [
            "Premium quality ingredients",
            "Rich, indulgent flavors",
            "Special occasion consumption",
            "High emotional satisfaction",
            "Often more expensive price point"
        ],
        examples: "Premium chocolate, artisan ice cream, craft desserts, specialty coffee",
        emotionalTargets: ["Happiness", "Satisfaction", "Pleasure", "Indulgence"]
    },
    escape: {
        name: "Escape",
        icon: "🌅",
        description: "Products that provide a break from routine and help consumers relax and unwind. They offer comfort and stress relief.",
        characteristics: [
            "Comforting flavors and textures",
            "Soothing sensory properties",
            "Consumed during downtime",
            "Stress-relieving benefits",
            "Personal, private consumption"
        ],
        examples: "Herbal tea, smooth chocolate, comfort snacks, relaxation beverages",
        emotionalTargets: ["Comfort", "Relaxation", "Calm", "Contentment"]
    },
    rejuvenation: {
        name: "Rejuvenation",
        icon: "⚡",
        description: "Products that deliver energy, refreshment, and revitalization. They help consumers feel alert, refreshed, and ready to go.",
        characteristics: [
            "Bright, refreshing flavors",
            "Energizing ingredients",
            "Revitalizing sensory properties",
            "On-the-go consumption",
            "Functional benefits"
        ],
        examples: "Energy drinks, fresh juices, citrus snacks, functional beverages",
        emotionalTargets: ["Energy", "Alertness", "Refreshment", "Vitality"]
    },
    sociability: {
        name: "Sociability",
        icon: "👥",
        description: "Products designed for sharing and social connection. They enhance gatherings and bring people together.",
        characteristics: [
            "Shareable formats/packaging",
            "Universally appealing flavors",
            "Interactive consumption",
            "Group occasions",
            "Conversation starters"
        ],
        examples: "Party snacks, sharing platters, social beverages, finger foods",
        emotionalTargets: ["Joy", "Connection", "Fun", "Belonging"]
    }
};

let currentQuestionIndex = 0;
let questionnaireAnswers = {};
let recommendedNeedState = null;

// Initialize questionnaire button
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-need-state-helper');
    if (btn) {
        btn.addEventListener('click', openNeedStateHelper);
    }
});

function openNeedStateHelper() {
    // Reset questionnaire
    currentQuestionIndex = 0;
    questionnaireAnswers = {};
    recommendedNeedState = null;

    // Show modal
    document.getElementById('need-state-modal').style.display = 'flex';

    // Initialize questionnaire
    updateQuestionDisplay();
    setupQuestionnaireNavigation();
}

function closeNeedStateHelper() {
    document.getElementById('need-state-modal').style.display = 'none';
}

function updateQuestionDisplay() {
    const question = needStateQuestions[currentQuestionIndex];
    const container = document.getElementById('questionnaire-questions');

    // Update progress
    const progress = ((currentQuestionIndex + 1) / needStateQuestions.length) * 100;
    document.getElementById('questionnaire-progress').style.width = progress + '%';
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = needStateQuestions.length;

    // Build question HTML
    let html = '<div class="question-card"><h4>' + question.question + '</h4><div class="question-options">';

    question.options.forEach((option, idx) => {
        const isSelected = questionnaireAnswers[question.id] === idx;
        const selectedClass = isSelected ? 'selected' : '';
        const checked = isSelected ? 'checked' : '';
        html += '<div class="question-option ' + selectedClass + '" onclick="selectAnswer(' + question.id + ', ' + idx + ')">';
        html += '<input type="radio" name="q' + question.id + '" value="' + idx + '" ' + checked + '>';
        html += '<label>' + option.text + '</label></div>';
    });

    html += '</div></div>';

    container.innerHTML = html;

    // Update navigation buttons
    updateNavigationButtons();
}

function selectAnswer(questionId, optionIndex) {
    questionnaireAnswers[questionId] = optionIndex;
    updateQuestionDisplay();
}

function setupQuestionnaireNavigation() {
    document.getElementById('btn-next-question').onclick = nextQuestion;
    document.getElementById('btn-prev-question').onclick = previousQuestion;
    document.getElementById('btn-see-results').onclick = calculateResults;
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('btn-prev-question');
    const nextBtn = document.getElementById('btn-next-question');
    const resultsBtn = document.getElementById('btn-see-results');

    // Show/hide previous button
    prevBtn.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';

    // Show next or results button
    if (currentQuestionIndex === needStateQuestions.length - 1) {
        nextBtn.style.display = 'none';
        resultsBtn.style.display = 'inline-block';
        // Enable results button only if question is answered
        resultsBtn.disabled = questionnaireAnswers[needStateQuestions[currentQuestionIndex].id] === undefined;
    } else {
        nextBtn.style.display = 'inline-block';
        resultsBtn.style.display = 'none';
        // Enable next button only if question is answered
        nextBtn.disabled = questionnaireAnswers[needStateQuestions[currentQuestionIndex].id] === undefined;
    }
}

function nextQuestion() {
    if (currentQuestionIndex < needStateQuestions.length - 1) {
        currentQuestionIndex++;
        updateQuestionDisplay();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateQuestionDisplay();
    }
}

function calculateResults() {
    // Calculate scores for each need state
    const scores = {
        reward: 0,
        escape: 0,
        rejuvenation: 0,
        sociability: 0
    };

    // Sum up scores from all answers
    needStateQuestions.forEach(question => {
        const answerIndex = questionnaireAnswers[question.id];
        if (answerIndex !== undefined) {
            const selectedOption = question.options[answerIndex];
            Object.entries(selectedOption.scores).forEach(([state, points]) => {
                scores[state] += points;
            });
        }
    });

    // Find the highest scoring need state
    let maxScore = 0;
    let topState = null;
    Object.entries(scores).forEach(([state, score]) => {
        if (score > maxScore) {
            maxScore = score;
            topState = state;
        }
    });

    recommendedNeedState = topState;

    // Display results
    displayResults(scores, topState);
}

function displayResults(scores, topState) {
    const resultsContainer = document.getElementById('questionnaire-results');
    const resultsContent = document.getElementById('recommended-need-state');

    // Hide questions, show results
    document.getElementById('questionnaire-questions').style.display = 'none';
    document.getElementById('btn-prev-question').style.display = 'none';
    document.getElementById('btn-next-question').style.display = 'none';
    document.getElementById('btn-see-results').style.display = 'none';
    resultsContainer.style.display = 'block';

    const profile = needStateProfiles[topState];

    const characteristicsList = profile.characteristics.map(char => '<li>' + char + '</li>').join('');

    let html = '<div class="need-state-result-card">';
    html += '<h4>' + profile.icon + ' ' + profile.name + '</h4>';
    html += '<div class="score">Score: ' + scores[topState] + ' points</div>';
    html += '<div class="description">' + profile.description + '</div>';
    html += '<div class="characteristics"><h5>Key Characteristics:</h5><ul>' + characteristicsList + '</ul></div>';
    html += '<div class="characteristics" style="margin-top: 15px;"><h5>Typical Examples:</h5><p style="margin: 0;">' + profile.examples + '</p></div>';
    html += '<div class="characteristics" style="margin-top: 15px;"><h5>Target Emotions:</h5><p style="margin: 0;">' + profile.emotionalTargets.join(', ') + '</p></div>';
    html += '</div>';

    // Add all scores
    const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const maxScoreValue = Math.max(...Object.values(scores));

    html += '<details style="margin-top: 20px;"><summary style="cursor: pointer; padding: 10px; background: #f8f9fa; border-radius: 8px; font-weight: 600;">See All Scores</summary>';
    html += '<div style="padding: 15px; background: #f8f9fa; margin-top: 10px; border-radius: 8px;">';

    sortedScores.forEach(([state, score]) => {
        const stateProfile = needStateProfiles[state];
        const percentage = (score / maxScoreValue) * 100;
        html += '<div style="margin-bottom: 15px;">';
        html += '<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">';
        html += '<strong>' + stateProfile.icon + ' ' + stateProfile.name + '</strong>';
        html += '<span>' + score + ' points</span></div>';
        html += '<div style="background: #dee2e6; height: 8px; border-radius: 4px; overflow: hidden;">';
        html += '<div style="background: linear-gradient(90deg, var(--primary-color), var(--secondary-color)); height: 100%; width: ' + percentage + '%; transition: width 0.3s;"></div>';
        html += '</div></div>';
    });

    html += '</div></details>';

    resultsContent.innerHTML = html;
}

function applyRecommendedNeedState() {
    if (!recommendedNeedState) return;

    // Select the appropriate radio button in the form
    const radio = document.querySelector('input[name="need-state"][value="' + recommendedNeedState + '"]');
    if (radio) {
        radio.checked = true;
    }

    // Close modal
    closeNeedStateHelper();

    // Show confirmation
    alert('✅ Need State set to: ' + needStateProfiles[recommendedNeedState].name);
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('need-state-modal');
    if (e.target === modal) {
        closeNeedStateHelper();
    }
});
