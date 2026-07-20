import { Show } from '@clerk/react';
import { ComingSoonModal } from '../components/ComingSoonModal';

export function AiTutorPage() {
    return (
        <Show
            when={{ plan: 'pro' }}
            fallback={<ComingSoonModal open onClose={() => { }} planName="Pro Tier" />}
        >
            <ComingSoonModal open onClose={() => { }} planName="Pro Tier" />
        </Show>
    );
}