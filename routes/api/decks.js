const express = require('express');
const asyncHandler = require('express-async-handler');
const { Deck, Category, Card, User, Score } = require('../../db/models');
const { check, validationResult } = require('express-validator');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const { authenticated, userInfo } = require('./security-utils');
const score = require('../../db/models/score');



const router = express();
const deckValidators = [
  check('name').notEmpty()
]
const cardValidators = [
  check('front').notEmpty(),
  check('back').notEmpty()
]
const errorFormatter = ({ msg, param }) => {
  return `${param}: ${msg}`;
};

const deckNotFoundError = (id) => {
  const err = Error("Deck not found");
  err.errors = [`Deck with id of ${id} could not be found.`];
  err.title = "Deck not found.";
  err.status = 404;
  return err;
};

// does not require auth
router.get('/', userInfo, asyncHandler(async (req, res, next) => {
  let query = (req.query.q) ? req.query.q : '';
  let offset = (req.query.offset) ? req.query.offset : 0;
  let userId = (req.user) ? req.user.id : null;
  const dbDecks = await Deck.findAll({
    limit: 50,
    offset,
    include: [{
      model: Category
    },
    {
      model: Card,
      attributes: ["id"]
    },
    {
      model: User,
      attributes: ["username"]
    },
    {
      model: Score,
      where: {
        userId
      },
      required: false,
    }
    ],
    where: {
      private: {
        [Op.is]: false,
      },
      name: {
        [Op.iLike]: `%${query}%`
      }
    },
  })
  const decks = {};
  dbDecks.forEach(deck => {
    const { id, name, categoryId, userId, createdAt, updatedAt } = deck;
    const privacy = deck.private;
    const numCards = deck.Cards.length;
    const category = deck.Category.label;
    const creator = deck.User.username;
    const maxScore = (deck.Scores.length) ? Math.max(...deck.Scores.map(score=>score.hits)) :null;
    decks[id] = {
      id,
      name,
      categoryId,
      creatorId: userId,
      privacy,
      numCards,
      category,
      creator,
      maxScore,
      createdAt,
      updatedAt,
    }
  })

  res.json(decks);
}))

// requires auth
router.post('/', authenticated, deckValidators, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req).formatWith(errorFormatter);
  if (!errors.isEmpty()) {
    return next({ status: 422, errors: errors.array() });
  }
  const { name, categoryId, private } = req.body;
  const userId = req.user.id;
  const deck = await Deck.create({ name, categoryId, userId, private });
  res.json(deck);
}))


// requires auth (user id must match deck's creator)
router.delete('/:deckId(\\d+)', authenticated, asyncHandler(async (req, res, next) => {
  const deckId = req.params.deckId;
  const deck = await Deck.findByPk(deckId);
  if (req.user.id !== deck.userId) {
    const err = new Error("Unauthorized");
    err.status = 401;
    err.message = "You are not authorized to delete this deck.";
    err.title = "Unauthorized";
    throw err;
  }
  if (deck) {
    await deck.destroy();
    res.json({ message: `Deleted deck with id of ${deckId}.` });
  } else {
    next(deckNotFoundError(deckId));
  }
}))


// requires auth on private decks
router.get('/:deckId(\\d+)', userInfo, asyncHandler(async (req, res, next) => {
  const deckId = req.params.deckId;
  let currentUserId = (req.user) ? req.user.id : null;
  const dbDeck = await Deck.findByPk(deckId, {
    include: [{
      model: Category
    },
    {
      model: Card,
      attributes: ["id"]
    },
    {
      model: User,
      attributes: ["username"]
    },
    {
      model: Score,
      where: {
        userId: currentUserId
      },
      required: false,
    }
    ],
    where: {
      private: {
        [Op.is]: false,
      },
    },
  });

  if (!dbDeck) {
    next(deckNotFoundError(deckId));
  }

  if (dbDeck.private) {
    if (!req.user || currentUserId !== dbDeck.userId) {
      const err = new Error("Unauthorized");
      err.status = 401;
      err.message = "You are not authorized to access this deck.";
      err.title = "Unauthorized";
      throw err;
    }
  }

  const { id, name, categoryId, userId, createdAt, updatedAt } = dbDeck;
  const privacy = dbDeck.private;
  const numCards = dbDeck.Cards.length;
  const category = dbDeck.Category.label;
  const creator = dbDeck.User.username;
  const maxScore = (dbDeck.Scores.length) ? Math.max(...dbDeck.Scores.map(score=>score.hits)) :null;
  const deck = {
    id,
    name,
    categoryId,
    creatorId: userId,
    privacy,
    numCards,
    category,
    creator,
    maxScore,
    createdAt,
    updatedAt,
  }

  res.json( deck );
}))


// get all cards from a particular deck
// requires auth for private decks
router.get('/:deckId(\\d+)/cards', userInfo, asyncHandler(async (req, res, next) => {
  const deckId = req.params.deckId;
  const deck = await Deck.findByPk(deckId, {
    include: [{
      model: Card
    },],
  });

  if (!deck) {
    next(deckNotFoundError(deckId));
  }

  if (deck.private) {
    if (!req.user || req.user.id !== deck.userId) {
      const err = new Error("Unauthorized");
      err.status = 401;
      err.message = "You are not authorized to access this deck.";
      err.title = "Unauthorized";
      throw err;
    }
  }
  const cards = {};
  deck.Cards.forEach(card => cards[card.id] = card)
  res.json(cards);
}))

// for editing deck info - have not tested
router.put('/:deckId(\\d+)', userInfo, asyncHandler(async (req, res, next) => {
  const deckId = req.params.deckId;
  const { name, categoryId, private } = req.body;
  const deck = await Deck.findByPk(deckId);

  if (req.user.id !== deck.userId) {
    const err = new Error("Unauthorized");
    err.status = 401;
    err.message = "You are not authorized to edit this deck.";
    err.title = "Unauthorized";
    throw err;
  }
  if (deck) {
    deck.name = name;
    deck.categoryId = categoryId;
    deck.private = private;

    await deck.save();
    res.json({ deck });
  } else {
    next(deckNotFoundError(deckId));
  }
}))


// creating a new card in a deck
router.post('/:deckId(\\d+)/cards', authenticated, cardValidators, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req).formatWith(errorFormatter);
  if (!errors.isEmpty()) {
    return next({ status: 422, errors: errors.array() });
  }
  const { front, back } = req.body;
  const card = await Card.create({ front, back, deckId: req.params.deckId });
  res.json(card );
}))


module.exports = router;
