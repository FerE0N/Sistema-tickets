// src/components/RoleSelector.jsx
'use client';

export default function RoleSelector({ value, onChange, isAdmin }) {
    const roles = isAdmin
        ? [
            { id: 1, label: 'Superadmin' },
            { id: 2, label: 'Admin' },
            { id: 3, label: 'Auxiliar' }
        ]
        : [{ id: 3, label: 'Auxiliar' }];

    return (
        <div className="pills">
            {roles.map((role) => (
                <button
                    key={role.id}
                    type="button"
                    className={`pill ${value === role.id ? 'active' : ''}`}
                    onClick={() => onChange(role.id)}
                >
                    {role.label}
                </button>
            ))}
        </div>
    );
}
