import { useCallback, useState } from 'react';
import ConfirmModal, { ConfirmOptions } from '../components/ConfirmModal';

/** Returns a function that opens a confirm modal, and the modal to render */
export const useConfirm = () => {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const close = useCallback(() => setOptions(null), []);
    const modal = options ? (
        <ConfirmModal {...options} onClose={close} />
    ) : null;
    return [setOptions, modal] as const;
};
