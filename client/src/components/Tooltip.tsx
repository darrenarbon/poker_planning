import { Tooltip as BootstrapTooltip } from 'bootstrap';
import { ReactNode, useEffect, useRef } from 'react';

type TooltipProps = {
    text: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    children: ReactNode;
};

/**
 * Shows a Bootstrap tooltip on hover or focus of its children. The wrapper
 * span lets the tooltip work on disabled buttons, which get no mouse events.
 */
const Tooltip = ({ text, placement = 'top', children }: TooltipProps) => {
    const ref = useRef<HTMLSpanElement>(null);
    const tooltip = useRef<BootstrapTooltip>();

    useEffect(() => {
        if (!ref.current) return;
        tooltip.current = new BootstrapTooltip(ref.current, {
            placement,
            trigger: 'hover focus',
        });
        return () => {
            tooltip.current?.dispose();
            tooltip.current = undefined;
        };
    }, [placement]);

    useEffect(() => {
        tooltip.current?.setContent({ '.tooltip-inner': text });
    }, [text]);

    return (
        <span ref={ref} className="d-inline-block" data-bs-title={text}>
            {children}
        </span>
    );
};

export default Tooltip;
