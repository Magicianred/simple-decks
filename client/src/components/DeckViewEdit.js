import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useHistory, NavLink } from 'react-router-dom'

import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';


import { formatRelative } from 'date-fns';

import FlashCardView from './FlashCardView';
import { loadDeckThunk, clearDeck } from '../store/decks';
import { openModal } from '../store/ui'
import DeleteDeckModal from './DeleteDeckModal';

const useStyles = makeStyles((theme) => ({
  icon: {
    marginRight: theme.spacing(2),
  },
  heroContent: {
    padding: theme.spacing(8, 0, 6),
  },
  heroButtons: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
  },

}));


const DeckViewEdit = () => {
  const history = useHistory();


  const classes = useStyles();

  const dispatch = useDispatch();


  const { deckId } = useParams();


  const deck = useSelector(state => state.entities.decks.activeDeck);
  const userId = useSelector(state => state.authentication.id);

  useEffect(() => {
    dispatch(loadDeckThunk(deckId));
    return () => dispatch(clearDeck())
  }, [deckId, dispatch])

  const firstUpdate = useRef(true);
  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }
    if (!Object.values(deck).length) {
      history.push("/")
    }

  }, [deck, history]);

  const handleClickOpen = () => {
    dispatch(openModal('addCardModal'));
  }

  const handleDeleteClickOpen = () => {
    dispatch(openModal('deleteDeckModal'));
  }



  return (
    <main>
      <div className={classes.heroContent}>
        <Container>
          <Typography component="h1" variant="h3" align="left" color="textPrimary" gutterBottom>
            {deck.name}
          </Typography>
          <Typography variant="h5" align="left" color="textSecondary" paragraph>
            {deck.category}
          </Typography>
          <Typography variant="h6" align="left" color="textSecondary" paragraph>
            {(deck.createdAt) ? `Created by ${deck.creator} ${formatRelative(new Date(deck.createdAt), new Date())}` : `Created by`}
          </Typography>

          {(userId === deck.creatorId) ? (
            <div className={classes.heroButtons}>
              <DeleteDeckModal />
              <Grid container spacing={2} >
                <Grid item>
                  <Button variant="contained" color="primary" onClick={handleClickOpen}>
                    Add Card
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="contained" color="primary" component={NavLink} to={`/practice/${deckId}`}>
                    Practice
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="contained" color="primary" component={NavLink} to={`/quiz/${deckId}`}>
                    quiz
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="outlined" color="secondary" onClick={handleDeleteClickOpen}>
                    Delete deck
                  </Button>
                </Grid>
              </Grid>
            </div>

          ) : <div />}
          <TableContainer component={Paper}>
            <FlashCardView />
          </TableContainer>
        </Container>
      </div>
    </main>
  )
}

export default DeckViewEdit;
