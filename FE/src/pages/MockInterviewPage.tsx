import { Protect } from '@clerk/react';
import { ComingSoonModal } from '../components/ComingSoonModal';

export function MockInterviewPage() {
    return (
        <Protect
            plan="pro"
            fallback={<ComingSoonModal open onClose={() => { }} planName="Pro Tier" />}
        >
            <ComingSoonModal open onClose={() => { }} planName="Pro Tier" />
        </Protect>
    );
}