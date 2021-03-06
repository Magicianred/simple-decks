const express = require('express');
const asyncHandler = require('express-async-handler');
const { check, validationResult } = require('express-validator');
const UserUtils = require('../../db/user-utils');
const { authenticated, generateToken } = require('./security-utils');
const { User, Deck, Score, Category, Card } = require('../../db/models');
const { handleValidationErrors } = require('./utils');
const bcrypt = require('bcryptjs');



const router = express.Router();

const email =
  check('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail();

const username =
  check('username')
    .not().isEmpty()
    .withMessage('Please provide a username')


const password =
  check('password')
    .not().isEmpty()
    .withMessage('Please provide a password');

router.get('/', asyncHandler(async function (req, res, next) {
  const users = await User.findAll();
  res.json({ users });
}));

router.post(
  "/",
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const {
      username,
      email,
      password
    } = req.body;


    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, hashedPassword });

    const { jti, token } = generateToken(user);
    user.tokenId = jti;
    await user.save();
    res.cookie('token', token, { maxAge: 604800000 });
    res.status(201).json({ token, user: user.toSafeObject() });
  })
);


// this is for getting all the cards associated with self
router.get('/me/decks', authenticated, asyncHandler(async (req, res, next) => {
  let offset = (req.query.offset) ? req.query.offset : 0;
  let userId = req.user.id;
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
      model: Score,
      where: {
        userId
      },
      required: false,
    },
    {
      model: User,
      attributes: ["username"]

    }],
    where: {
      userId
    }
  })

  const decks = {};
  dbDecks.forEach(deck => {
    const { id, name, categoryId, userId, createdAt, updatedAt} = deck;
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


// posting a new score
router.post('/me/decks/:deckId(\\d+)/scores', authenticated, asyncHandler(async (req, res, next) => {
  const deckId = req.params.deckId;
  const userId = req.user.id;
  const { hits, total } = req.body;
  const score = await Score.create({ deckId, userId, hits, total })
  const deck = await Deck.findByPk (deckId, {
    include: Score
  })
  const maxScore = (deck.Scores.length) ? Math.max(...deck.Scores.map(score=>score.hits)) :null;
  // const response = Math.max(...deck.Scores.map(score=>score.hits));
  res.json({maxScore})
}))


module.exports = router;
