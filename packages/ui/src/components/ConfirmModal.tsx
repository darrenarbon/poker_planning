import { ReactNode, useEffect, useRef } from 'react';

export type ConfirmOptions = {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    /** Bootstrap button variant for the confirm button */
    variant?: 'primary' | 'danger';
    onConfirm: () => void;
};

type ConfirmModalProps = ConfirmOptions & { onClose: () => void };

/**
 * A React-controlled Bootstrap modal asking the user to confirm an action.
 * Escape or the backdrop cancels; focus starts on the confirm button.
 */
const ConfirmModal = ({
    title,
    message,
    confirmLabel = 'Confirm',
    variant = 'primary',
    onConfirm,
    onClose,
}: ConfirmModalProps) => {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        confirmRef.current?.focus();
        document.body.classList.add('modal-open');
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.classList.remove('modal-open');
            previous?.focus();
        };
    }, [onClose]);

    return (
        <>
            <div
                className="modal d-block"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirmModalTitle"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h1
                                className="modal-title fs-5"
                                id="confirmModalTitle"
                            >
                                {title}
                            </h1>
                            <button
                                type="button"
                                className="btn-close"
                                aria-label="Close"
                                onClick={onClose}
                            />
                        </div>
                        <div className="modal-body">{message}</div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                ref={confirmRef}
                                type="button"
                                className={`btn btn-${variant}`}
                                onClick={() => {
                                    onClose();
                                    onConfirm();
                                }}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop show" />
        </>
    );
};

export default ConfirmModal;
