type ErrorAlertProps = {
    message: string | null | undefined;
    onDismiss?: () => void;
};

/** Dismissible Bootstrap error banner; renders nothing without a message */
const ErrorAlert = ({ message, onDismiss }: ErrorAlertProps) => {
    if (!message) return null;

    return (
        <div
            className="alert alert-danger d-flex justify-content-between align-items-center my-3"
            role="alert"
        >
            <span>{message}</span>
            {onDismiss && (
                <button
                    type="button"
                    className="btn-close"
                    aria-label="Dismiss"
                    onClick={onDismiss}
                ></button>
            )}
        </div>
    );
};

export default ErrorAlert;
