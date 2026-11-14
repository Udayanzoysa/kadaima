/**
 * Rotating Daily Topic & Trick Banks for Kadaima Facebook Auto-Posting Bot.
 * Ensures every day's morning puzzle, midday vocabulary set, and evening math trick
 * covers a genuinely different topic instead of repeating the same examples.
 */

const MORNING_TOPICS = [
  {
    id: "number_pattern",
    title: "Number Sequence / Pattern Puzzle",
    promptInstruction:
      "Create a fun number sequence / missing-number pattern puzzle suitable for O/L or scholarship students (e.g. arithmetic, square, alternating, or Fibonacci-style pattern). Show 4-5 numbers and ask what comes next.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "logic_riddle",
    title: "Logical Thinking / Brain Teaser",
    promptInstruction:
      "Create a short, clever logical reasoning puzzle or brain teaser in Sinhala (e.g. seating order, siblings, truth-teller riddle, or everyday logic). Make sure there is one clear, unambiguous answer.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "science_everyday",
    title: "Everyday Science Question",
    promptInstruction:
      "Ask an interesting, school-level everyday science question (Physics, Chemistry, or Biology — e.g. why the sky looks blue, states of matter, human body facts, photosynthesis, or electricity) with 3 or 4 short choices or a direct question.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "percentage_practical",
    title: "Quick Percentage / Discount Puzzle",
    promptInstruction:
      "Create a practical real-life percentage or shop-discount mental math question (e.g. original price vs discount, or exam score percentage) that students can solve mentally.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "clock_calendar",
    title: "Clock / Time / Calendar Puzzle",
    promptInstruction:
      "Create a short puzzle involving days of the week, calendar dates, or clock time / angles between clock hands.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "age_word_problem",
    title: "Age Word Puzzle",
    promptInstruction:
      "Create a friendly, simple two-step age puzzle (e.g. comparing two siblings' or parent-child ages now and a few years later) with clean integer answers.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "sri_lanka_gk",
    title: "Sri Lankan General Knowledge Quiz",
    promptInstruction:
      "Ask a crisp, accurate Sri Lankan General Knowledge question (Geography, History, rivers, mountains, heritage, or national facts) suitable for school students.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "speed_distance_time",
    title: "Speed, Distance & Time Teaser",
    promptInstruction:
      "Create a short, intuitive speed-distance-time question (e.g. a bus, train, or cyclist travelling between two towns in Sri Lanka) with easy mental numbers.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "english_grammar_quick",
    title: "Quick English Grammar Challenge",
    promptInstruction:
      "Give a short 1-sentence English grammar challenge (preposition, tense, or subject-verb agreement) with 3 options (A, B, C) explained in Sinhala, asking followers to comment the correct letter.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "ratio_sharing",
    title: "Ratio & Sharing Problem",
    promptInstruction:
      "Create a quick ratio or proportional sharing problem (e.g. dividing money, sweets, or marks in a ratio like 2:3 or 3:5) with clean whole-number answers.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "geometry_shapes",
    title: "Geometry: Area, Perimeter or Angles",
    promptInstruction:
      "Create a short mental geometry question (e.g. finding the third angle of a triangle, perimeter vs area of a rectangle/square, or sum of angles).",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "ict_basics",
    title: "ICT & Computing Quiz",
    promptInstruction:
      "Ask a neat O/L or A/L ICT question (e.g. binary-to-decimal conversion, storage units KB/MB/GB, shortcut keys, or logic gates) with a clear single answer.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "odd_one_out",
    title: "Find the Odd One Out",
    promptInstruction:
      "Give 4 items (words, numbers, or science/geography items) and ask students to identify which one does NOT belong and why.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "profit_loss",
    title: "Profit & Loss Mental Problem",
    promptInstruction:
      "Create a short, realistic buying-and-selling profit or loss question (e.g. buying a book or fruit and selling for profit/loss %) with easy numbers.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "probability_puzzle",
    title: "Probability Quick Question",
    promptInstruction:
      "Create a simple probability question using a fair dice, coins, or colored balls in a bag, asking for the fraction or percentage probability.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "bodmas_order",
    title: "Order of Operations (BODMAS) with Brackets/Division",
    promptInstruction:
      "Create a fresh BODMAS / order-of-operations puzzle that includes brackets () or division ÷ (NOT just +, ×, −). NEVER use 5 + 3 × 2 - 4, 8 + 4 × 2 - 3, or 5 + 5 × 5 - 5.",
    forbiddenTerms: [],
  },
  {
    id: "space_world_gk",
    title: "Space & World Geography Quiz",
    promptInstruction:
      "Ask an exciting question about the solar system, planets, oceans, or world geography that school learners enjoy answering.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "average_marks",
    title: "Average / Mean Calculation Puzzle",
    promptInstruction: "Create a quick puzzle about finding a missing exam mark given the average of 3 or 4 subjects.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "prime_factors",
    title: "Prime Numbers / HCF / LCM Teaser",
    promptInstruction:
      "Create a short puzzle involving prime numbers, factors, LCM (කු.පො.ගු), or HCF (ම.පො.සා) — for example, two bells ringing at intervals.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
  {
    id: "sinhala_language",
    title: "Sinhala Language / Proverb Quiz",
    promptInstruction:
      "Ask a thoughtful question about a Sinhala idiom/proverb (ප්‍රස්ථාව පිරුළු), grammar, or accurate Sinhala spelling/meaning.",
    forbiddenTerms: ["BODMAS", "PEMDAS"],
  },
];

const MIDDAY_TOPICS = [
  {
    id: "workplace_career",
    title: "Workplace, Office & Career Vocabulary",
    promptInstruction:
      "Teach 10 practical English words used in workplaces, job interviews, and professional communication (e.g. Collaborate, Deadline, Initiative, Resume, Negotiate, Supervise, etc.).",
  },
  {
    id: "science_innovation",
    title: "Science, Technology & Innovation",
    promptInstruction:
      "Teach 10 useful English words related to science, technology, and modern inventions (e.g. Experiment, Hypothesis, Sustainable, Breakthrough, Device, Accuracy, etc.).",
  },
  {
    id: "environment_nature",
    title: "Environment, Climate & Nature",
    promptInstruction:
      "Teach 10 useful English words about the environment, wildlife, and climate (e.g. Conservation, Ecosystem, Pollution, Renewable, Habitat, Drought, etc.).",
  },
  {
    id: "health_wellness",
    title: "Health, Wellness & Daily Habits",
    promptInstruction:
      "Teach 10 useful English words about health, nutrition, and wellbeing (e.g. Immunity, Balanced, Fatigue, Symptom, Hydration, Recovery, etc.).",
  },
  {
    id: "travel_places",
    title: "Travel, Transport & Directions",
    promptInstruction:
      "Teach 10 useful English words for travelling, directions, and tourism (e.g. Itinerary, Departure, Destination, Accommodate, Landmark, Currency, etc.).",
  },
  {
    id: "emotions_character",
    title: "Emotions, Attitude & Personality Traits",
    promptInstruction:
      "Teach 10 expressive English words describing feelings and character traits (e.g. Resilient, Empathetic, Confident, Anxious, Determined, Humble, etc.).",
  },
  {
    id: "education_exams",
    title: "Study Skills, School & Exam Vocabulary",
    promptInstruction:
      "Teach 10 useful English words related to studying, school life, and exams (e.g. Comprehension, Curriculum, Revise, Concentrate, Assignment, Evaluate, etc.).",
  },
  {
    id: "money_commerce",
    title: "Money, Banking & Everyday Economics",
    promptInstruction:
      "Teach 10 practical English words about money, budgeting, and business (e.g. Budget, Expense, Profit, Invest, Transaction, Affordable, etc.).",
  },
  {
    id: "communication_media",
    title: "Communication & Digital Media",
    promptInstruction:
      "Teach 10 useful English words related to speaking, writing, and news/media (e.g. Persuade, Clarify, Broadcast, Feedback, Summarize, Credible, etc.).",
  },
  {
    id: "phrasal_verbs_daily",
    title: "Everyday Phrasal Verbs",
    promptInstruction:
      "Teach 10 essential everyday English phrasal verbs with accurate Sinhala meanings (e.g. Carry out, Give up, Look forward to, Figure out, Run out of, Put off, etc.).",
  },
  {
    id: "strong_essay_verbs",
    title: "Strong Action Verbs for Essays & Speaking",
    promptInstruction:
      "Teach 10 strong English verbs great for O/L and A/L essays (e.g. Enhance, Overcome, Establish, Emphasize, Transform, Encourage, Resolve, etc.).",
  },
  {
    id: "connectors_linking",
    title: "Linking Words & Transitions",
    promptInstruction:
      "Teach 10 useful English linking words and transition phrases for essays and speaking (e.g. Furthermore, Nevertheless, Consequently, Meanwhile, Despite, Therefore, etc.).",
  },
  {
    id: "time_productivity",
    title: "Time Management & Productivity",
    promptInstruction:
      "Teach 10 useful English words about planning, habits, and productivity (e.g. Prioritize, Procrastinate, Consistent, Schedule, Accomplish, Punctual, etc.).",
  },
  {
    id: "society_citizenship",
    title: "Society, Law & Community Life",
    promptInstruction:
      "Teach 10 useful English words related to society, rights, and responsibilities (e.g. Responsibility, Equality, Volunteer, Harmony, Regulation, Diversity, etc.).",
  },
  {
    id: "food_cooking",
    title: "Food, Cooking & Flavors",
    promptInstruction:
      "Teach 10 practical English words related to cooking, ingredients, and taste (e.g. Ingredient, Simmer, Nutritious, Crispy, Marinate, Appetite, etc.).",
  },
  {
    id: "problem_solving",
    title: "Critical Thinking & Problem Solving",
    promptInstruction:
      "Teach 10 useful English words for reasoning and solving problems (e.g. Alternative, Obstacle, Strategy, Perspective, Solution, Crucial, etc.).",
  },
];

const EVENING_TOPICS = [
  {
    id: "mul_by_25",
    title: "Fast Multiplication by 25",
    promptInstruction:
      "Teach how to multiply any number by 25 in seconds by dividing by 4 and multiplying by 100 (show a clean worked example like 36 × 25 or 48 × 25, and mention what happens with a remainder if helpful, or keep it cleanly divisible by 4, then give a different practice question).",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /\b43\b.*\b11\b/, /\b62\b.*\b11\b/, /35²|75²/],
  },
  {
    id: "percentage_swap",
    title: "Percentage Reversal Trick (x% of y = y% of x)",
    promptInstruction:
      "Teach the percentage reversal trick: x% of y is always equal to y% of x! For example, finding 16% of 25 is hard, so flip it to 25% of 16 (= 1/4 of 16 = 4). Give a clear worked example and a new practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "square_near_50",
    title: "Squaring Numbers Close to 50",
    promptInstruction:
      "Teach how to square any number near 50 in seconds (e.g. 53² or 47²): take difference d from 50, compute (25 ± d) as the first two digits and d² (as 2 digits) at the end. Give a clear worked example and a practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "mul_same_tens_units_10",
    title: "Multiplying Numbers with Same Tens Digit & Units Summing to 10",
    promptInstruction:
      "Teach the trick for multiplying two 2-digit numbers where the tens digits match and the ones digits add up to 10 (e.g. 43 × 47 or 64 × 66): multiply tens digit by (tens digit + 1), then attach the product of the ones digits (2 digits). Give a worked example and a practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "mul_by_15",
    title: "Fast Multiplication by 15",
    promptInstruction:
      "Teach how to multiply any number by 15 mentally: multiply by 10, take half of that result, and add them together (e.g. 24 × 15 = 240 + 120 = 360). Give a worked example and a new practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "sub_from_1000",
    title: "Subtracting Any Number from 1000 or 10000",
    promptInstruction:
      "Teach the 'All from 9 and the last from 10' subtraction trick for 1000 − ABC (e.g. 1000 − 364: subtract 3 and 6 from 9, and 4 from 10 -> 636). Explain clearly with a worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "div_by_5",
    title: "Fast Division by 5",
    promptInstruction:
      "Teach how to divide any number by 5 mentally: double the number and divide by 10 (shift decimal one place left, e.g. 142 ÷ 5 -> 284 ÷ 10 = 28.4, or 230 ÷ 5 = 46). Give a worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "mul_by_9_99",
    title: "Fast Multiplication by 9 or 99",
    promptInstruction:
      "Teach how to multiply any number by 99 (or 9) fast without column multiplication: multiply by 100 and subtract the original number (e.g. 46 × 99 = 4600 − 46 = 4554). Give a clear worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "diff_of_squares_mul",
    title: "Multiplying Symmetric Numbers Using a² − b²",
    promptInstruction:
      "Teach how to multiply two numbers equally spaced from a round number using (a − b)(a + b) = a² − b² (e.g. 28 × 32 = (30 − 2)(30 + 2) = 900 − 4 = 896). Give a clear worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "square_near_100",
    title: "Squaring Numbers Close to 100",
    promptInstruction:
      "Teach how to square numbers just below or above 100 (e.g. 96² or 104²) using distance from 100: for 96² (4 below 100), 96 − 4 = 92 and 4² = 16 -> 9216. Give a clear worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "mul_by_5",
    title: "Fast Multiplication by 5",
    promptInstruction:
      "Teach how to multiply any number by 5 instantly: halve the number and multiply by 10 (if odd, subtract 1, halve, and put 5 at the end — e.g. 48 × 5 = 240, 37 × 5 = 185). Give a clear worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "percent_10_5_1",
    title: "Finding 15% or 18% Mentally (10% + 5% + 1%)",
    promptInstruction:
      "Teach how to calculate tricky percentages like 15% or 12% mentally in seconds by breaking them into 10% + 5% or 10% + 1% + 1% (e.g. 15% of 420 = 42 + 21 = 63). Give a clear worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "divisibility_3_9",
    title: "Instant Divisibility Check for 3 and 9",
    promptInstruction:
      "Teach how to tell instantly if a huge number (like 47,286) is divisible by 3 or 9 without dividing: just add its digits! Explain clearly with a worked example and a practice check question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "mul_teens",
    title: "Multiplying Two Numbers Between 11 and 19",
    promptInstruction:
      "Teach the shortcut for multiplying two numbers from 12 to 19 (e.g. 14 × 17): add the ones digit of the second to the first number (14 + 7 = 21 -> 210), then add the product of the ones digits (4 × 7 = 28 -> 238). Give a worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "div_by_25",
    title: "Fast Division by 25",
    promptInstruction:
      "Teach how to divide any number by 25 mentally: multiply the number by 4 and divide by 100 (move decimal two places left, e.g. 320 ÷ 25 -> 320 × 4 = 1280 -> 12.8). Give a clear worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "mul_near_100",
    title: "Multiplying Two Numbers Near 100 (Base 100 Method)",
    promptInstruction:
      "Teach the Vedic/base-100 shortcut for multiplying two numbers like 97 × 94: deficits from 100 are -3 and -6; cross-subtract (97 − 6 = 91) and multiply deficits (3 × 6 = 18) -> 9118. Give a clear worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "sum_consecutive",
    title: "Adding Consecutive Numbers Fast (Gauss Pairing Trick)",
    promptInstruction:
      "Teach how to add consecutive numbers from 1 to N (e.g. 1 + 2 + ... + 50) in seconds using n × (n + 1) ÷ 2. Give a worked example and a practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "mul_by_125",
    title: "Fast Multiplication by 125",
    promptInstruction:
      "Teach how to multiply numbers by 125 fast: divide by 8 and multiply by 1000 (e.g. 32 × 125 = (32 ÷ 8) × 1000 = 4000). Give a clear worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "fraction_butterfly",
    title: "Butterfly Method for Adding Fractions",
    promptInstruction:
      "Teach the Butterfly Method for quickly adding two fractions with different denominators (e.g. 2/3 + 1/4 = (2×4 + 1×3)/(3×4) = 11/12). Give a worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "speed_kmh_ms",
    title: "Converting km/h to m/s Quickly",
    promptInstruction:
      "Teach the exam shortcut for converting km/h to m/s (multiply by 5/18) and m/s to km/h (multiply by 18/5), e.g. 72 km/h = 72 × 5/18 = 20 m/s. Give a worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "divisibility_11",
    title: "Checking Divisibility by 11 Instantly",
    promptInstruction:
      "Teach how to test if a large number (e.g. 38,412) is divisible by 11 using alternating sum/difference of digits. Explain clearly with a worked example and practice question.",
    forbiddenPatterns: [/43\s*×\s*11/, /62\s*×\s*11/, /35²|75²/],
  },
  {
    id: "mul_by_12",
    title: "Fast Mental Multiplication by 12",
    promptInstruction:
      "Teach how to multiply any number by 12 mentally: multiply by 10 and add double the original number (e.g. 34 × 12 = 340 + 68 = 408). Give a worked example and practice question.",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /35²|75²/],
  },
  {
    id: "square_ending_5",
    title: "Squaring Numbers Ending in 5",
    promptInstruction:
      "Teach how to square numbers ending in 5 (e.g. 65² or 85²). Do NOT use 35² or 75² since we already posted those! Show step-by-step and give a fresh practice question (e.g. 45² or 95²).",
    forbiddenPatterns: [/×\s*11\b/, /\b11\s*×/, /\b35²\b/, /\b75²\b/],
  },
  {
    id: "mul_by_11",
    title: "Multiplying Two-Digit Numbers by 11",
    promptInstruction:
      "Teach multiplying a two-digit number by 11 with a carry example (sum > 9, e.g. 58 × 11 = 638). NEVER use 43 × 11 or 62 × 11!",
    forbiddenPatterns: [/\b43\s*×\s*11\b/, /\b62\s*×\s*11\b/, /35²|75²/],
  },
];

const TOPIC_BANKS = {
  morning: MORNING_TOPICS,
  midday: MIDDAY_TOPICS,
  evening: EVENING_TOPICS,
};

function getTopicsForSlot(slot) {
  return TOPIC_BANKS[slot] || [];
}

/**
 * Selects the next topic for a slot deterministically in round-robin order,
 * skipping recently used topic IDs so consecutive days never repeat the same topic.
 */
function selectNextTopic(slot, storage) {
  const topics = getTopicsForSlot(slot);
  if (topics.length === 0) {
    throw new Error(`No topic bank configured for slot: ${slot}`);
  }

  const slotState = storage.getSlotTopicState(slot);
  const lastIndex = typeof slotState.lastTopicIndex === "number" ? slotState.lastTopicIndex : -1;
  const recentIds = new Set(Array.isArray(slotState.recentTopicIds) ? slotState.recentTopicIds : []);

  // Also exclude topic IDs from recent drafts/history stored with topicId metadata
  const recentMetaIds = storage.getRecentTopicIdsForSlot(slot, Math.min(topics.length - 1, 12));
  for (const id of recentMetaIds) {
    recentIds.add(id);
  }

  // Find the next topic in rotation not in recentIds
  for (let offset = 1; offset <= topics.length; offset++) {
    const candidateIndex = (lastIndex + offset) % topics.length;
    const candidate = topics[candidateIndex];
    if (!recentIds.has(candidate.id)) {
      return { ...candidate, index: candidateIndex };
    }
  }

  // Fallback if every topic was recently used: strictly advance by 1
  const nextIndex = (lastIndex + 1) % topics.length;
  return { ...topics[nextIndex], index: nextIndex };
}

module.exports = {
  MORNING_TOPICS,
  MIDDAY_TOPICS,
  EVENING_TOPICS,
  getTopicsForSlot,
  selectNextTopic,
};
