import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalOverflow from '@mui/joy/ModalOverflow';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import ModalClose from '@mui/joy/ModalClose';
import { useState } from 'react';

export default function ModalWrapper({
  title,
  content,
  children,
  isOpen,
  handleClose,
  contentClassName = '',
  dialogSx = {},
}) {
  const [open, setOpen] = useState(true);

  return (
    <Modal
      open={isOpen !== undefined ? isOpen : open}
      onClose={handleClose || (() => setOpen(false))}
    >
      <ModalOverflow>
        <ModalDialog sx={dialogSx}>
          <ModalClose />
          <DialogTitle>{title}</DialogTitle>
          <DialogContent className={contentClassName}>{content}</DialogContent>
          {children}
        </ModalDialog>
      </ModalOverflow>
    </Modal>
  );
}
