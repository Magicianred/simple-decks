import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';


import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from '@material-ui/core/Button'
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete'
import IconButton from '@material-ui/core/IconButton'

import { loadCardsThunk, clearCards, deleteCardThunk, setActiveCard } from '../store/cards';
import { openModal } from '../store/ui';
import NewCardModal from './NewCardModal';
import EditCardModal from './EditCardModal';

// import ReactMarkdown from 'react-markdown';
import Markdown from 'markdown-to-jsx';

const useStyles = makeStyles((theme) => ({
  table: {
    minWidth: 650,
  },
}));


const FlashCardView = () => {
  const classes = useStyles();
  const { deckId } = useParams();

  const flashcards = useSelector(state => state.entities.cards.byId);
  const deckCreatorId = useSelector(state => state.entities.decks.activeDeck.creatorId);
  const userId = useSelector(state => state.authentication.id);
  const activeCard = useSelector(state => state.entities.cards.activeCard)

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadCardsThunk(deckId))
    return () => dispatch(clearCards());
  }, [deckId, dispatch])

  const handleClickOpen = () => {
    dispatch(openModal('addCardModal'));
  }

  const handleDelete = (e) => {
    dispatch(deleteCardThunk(e.currentTarget.id))
  }

  const handleEdit = e => {
    dispatch(setActiveCard(e.currentTarget.id))
  }

  useEffect(() => {
    if (activeCard) {
      dispatch(openModal('editCardModal'));
    }
  }, [activeCard, dispatch])

  return (
    // <TableContainer component={Paper}>
    <Table className={classes.table} aria-label="flashcard-table">
      <TableHead>
        <TableRow>
          <TableCell align="left" width={(userId === deckCreatorId) ? "40%" : "50%"}>Front</TableCell>
          <TableCell align="left" width={(userId === deckCreatorId) ? "40%" : "50%"}>Back</TableCell>
          <TableCell><NewCardModal /><EditCardModal /></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.values(flashcards).map((flashcard) => (
          <TableRow key={flashcard.id}>
            <TableCell align="left">
              <Markdown>{flashcard.front}</Markdown>
            </TableCell>
            <TableCell align="left">
              <Markdown>{flashcard.back}</Markdown>
            </TableCell>
            {(userId === deckCreatorId) ? (
              <TableCell align="right" size="small" style={{ verticalAlign: 'top' }}>
                <IconButton id={flashcard.id} onClick={handleEdit}>
                  <EditIcon />
                </IconButton>
                <IconButton id={flashcard.id} onClick={handleDelete}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            ) : <TableCell />}
          </TableRow>
        ))}

        {(userId===deckCreatorId) ? (
        <TableRow>
          <TableCell align="center" colSpan={3}>
            <Button color="primary" size='large' variant='contained' onClick={handleClickOpen}>
              Add card
            </Button>
          </TableCell>
        </TableRow>
        ) : <TableRow />}
      </TableBody>
    </Table>
  );
}

export default FlashCardView;
