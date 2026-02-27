// src/components/forms/UserForm.jsx
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

// Kit de formularios con glassmorphism
import Form, {
    FormSection,
    FormTitle,
    FormGrid,
    FormField,
    Input,
    Select,
    FormActions,
} from './UseForm';

export default function UserForm({ token, initial, onCancel, onSaved }) {
    const editing = Boolean(initial?.user_id);

    const [form, setForm] = useState({
        name: '',
        last_name: '',
        email: '',
        role_id: 3,
        department_id: '',
        password: '',
    });

    const [deps, setDeps] = useState([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({}); // { field: 'mensaje' }

    // Carga inicial
    useEffect(() => {
        if (initial) {
            setForm((f) => ({
                ...f,
                ...initial,
                // nunca precargar password al editar
                password: '',
            }));
        }
        (async () => {
            try {
                const d = await apiFetch('/departamentos'); // GET público
                setDeps(Array.isArray(d) ? d : []);
            } catch {
                setDeps([]);
            }
        })();
    }, [initial]);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        // limpia error específico al cambiar
        if (errors[name]) {
            setErrors((errs) => {
                const { [name]: _omit, ...rest } = errs;
                return rest;
            });
        }
    };

    // Validaciones mínimas amigables
    const validate = () => {
        const errs = {};
        if (!form.name?.trim()) errs.name = 'El nombre es obligatorio.';
        if (!form.last_name?.trim()) errs.last_name = 'El apellido es obligatorio.';
        if (!form.email?.trim()) errs.email = 'El correo es obligatorio.';
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Formato de correo no válido.';
        if (!editing && !form.password?.trim()) errs.password = 'La contraseña es obligatoria.';
        if (form.role_id == null || form.role_id === '') errs.role_id = 'Selecciona un rol.';
        // department_id puede ir vacío (sin departamento)
        return errs;
    };

    const submit = async (e) => {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSaving(true);
        try {
            if (editing) {
                const { password, ...payload } = form; // no mandamos password en edición
                await apiFetch(`/users/${initial.user_id}`, {
                    method: 'PUT',
                    token,
                    body: payload,
                });
            } else {
                await apiFetch('/users', {
                    method: 'POST',
                    token,
                    body: form,
                });
            }
            onSaved?.();
        } catch (e) {
            // Puedes mapear mensajes del backend a un error global o por campo
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Form onSubmit={submit} className="form" /* onGlass si el modal está sobre fondo animado */>
            <FormSection>
                <FormTitle>{editing ? 'Editar usuario' : 'Crear usuario'}</FormTitle>

                <FormGrid>
                    <FormField label="Nombre" htmlFor="name" error={errors.name}>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Nombre"
                            value={form.name}
                            onChange={onChange}
                            disabled={saving}
                            error={!!errors.name}
                        />
                    </FormField>

                    <FormField label="Apellido" htmlFor="last_name" error={errors.last_name}>
                        <Input
                            id="last_name"
                            name="last_name"
                            placeholder="Apellido"
                            value={form.last_name}
                            onChange={onChange}
                            disabled={saving}
                            error={!!errors.last_name}
                        />
                    </FormField>

                    <FormField label="Email" htmlFor="email" className="col-span-full" error={errors.email}>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="usuario@correo.com"
                            value={form.email}
                            onChange={onChange}
                            disabled={saving}
                            error={!!errors.email}
                        />
                    </FormField>

                    {!editing && (
                        <FormField
                            label="Contraseña"
                            htmlFor="password"
                            className="col-span-full"
                            error={errors.password}
                        >
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={onChange}
                                disabled={saving}
                                error={!!errors.password}
                            />
                        </FormField>
                    )}

                    <FormField label="Rol" htmlFor="role_id" error={errors.role_id}>
                        <Select
                            id="role_id"
                            name="role_id"
                            value={form.role_id}
                            onChange={onChange}
                            disabled={saving}
                            error={!!errors.role_id}
                        >
                            <option value={1}>Superadmin</option>
                            <option value={2}>Admin</option>
                            <option value={3}>Auxiliar</option>
                        </Select>
                    </FormField>

                    <FormField label="Departamento" htmlFor="department_id">
                        <Select
                            id="department_id"
                            name="department_id"
                            value={form.department_id ?? ''}
                            onChange={onChange}
                            disabled={saving}
                        >
                            <option value="">(sin departamento)</option>
                            {deps.map((d) => (
                                <option key={d.department_id} value={d.department_id}>
                                    {d.department_name}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                </FormGrid>
            </FormSection>

            <FormActions>
                <button disabled={saving} className="btn btn-brand" type="submit">
                    {saving && <span className="spinner" />}
                    {editing ? 'Guardar cambios' : 'Crear usuario'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
                    Cancelar
                </button>
            </FormActions>
        </Form>
    );
}
