'use client';

import React from 'react';
import { Connect } from '@stacks/connect-react';
import { userSession, appDetails } from '../lib/stacks';

export default function Providers({ children }: { children: React.ReactNode }) {
    const authOptions = {
        appDetails,
        redirectTo: '/',
        onFinish: () => {
            window.location.reload();
        },
        userSession,
    };

    return <Connect authOptions={authOptions}>{children}</Connect>;
}
