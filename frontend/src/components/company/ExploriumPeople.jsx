// ============================================================
// FRONTEND
// src/components/company/ExploriumPeople.jsx
// ============================================================

import {
    useState,
} from 'react';

import {
    enrichCompanyWithExplorium,
} from '../../api/exploriumApi';

export default function ExploriumPeople({
    company,
}) {
    const [
        people,
        setPeople,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState('');

    async function loadPeople() {
        try {
            setLoading(true);
            setError('');

            const result =
                await enrichCompanyWithExplorium(
                    company
                );

            setPeople(
                result.people || []
            );
        } catch (err) {
            console.error(
                err
            );

            setError(
                err.response?.data
                    ?.message ||
                'Unable to retrieve company people.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section>
            <div
                style={{
                    display: 'flex',
                    justifyContent:
                        'space-between',
                    alignItems:
                        'center',
                }}
            >
                <div>
                    <h2>
                        Points of Contact
                    </h2>

                    <p>
                        Find people,
                        professional emails
                        and phone numbers.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        loadPeople
                    }
                    disabled={
                        loading
                    }
                >
                    {loading
                        ? 'Finding people...'
                        : 'Find Company People'}
                </button>
            </div>

            {error && (
                <div>
                    {error}
                </div>
            )}

            {!loading &&
                people.length ===
                0 && (
                    <p>
                        No people found yet.
                    </p>
                )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '16px',
                }}
            >
                {people.map(
                    (person) => (
                        <div
                            key={
                                person.providerId ||
                                person.fullName
                            }
                            style={{
                                border:
                                    '1px solid #ddd',
                                borderRadius:
                                    '12px',
                                padding:
                                    '16px',
                            }}
                        >
                            <h3>
                                {person.fullName ||
                                    'Unknown'}
                            </h3>

                            <p>
                                {person.title ||
                                    'Title unavailable'}
                            </p>

                            {person.department && (
                                <p>
                                    Department:{' '}
                                    {
                                        person.department
                                    }
                                </p>
                            )}

                            {person.seniority && (
                                <p>
                                    Seniority:{' '}
                                    {
                                        person.seniority
                                    }
                                </p>
                            )}

                            <hr />

                            <p>
                                <strong>
                                    Email:
                                </strong>{' '}
                                {person.email ||
                                    'Not available'}
                            </p>

                            <p>
                                <strong>
                                    Phone:
                                </strong>{' '}
                                {person.phone ||
                                    person.mobilePhone ||
                                    'Not available'}
                            </p>

                            {person.email && (
                                <a
                                    href={`mailto:${person.email}`}
                                >
                                    Send Email
                                </a>
                            )}

                            {(person.phone ||
                                person.mobilePhone) && (
                                    <a
                                        href={`tel:${person.phone ||
                                            person.mobilePhone
                                            }`}
                                        style={{
                                            marginLeft:
                                                '12px',
                                        }}
                                    >
                                        Call
                                    </a>
                                )}

                            {person.linkedinUrl && (
                                <div>
                                    <a
                                        href={
                                            person.linkedinUrl
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        LinkedIn
                                    </a>
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </section>
    );
}