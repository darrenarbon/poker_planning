import { useAuth0 } from '@auth0/auth0-react';
import { FormEvent, useEffect, useState } from 'react';
import ErrorAlert from '../../components/ErrorAlert';
import { useProfile } from '../../hooks';

/** Lets the user change the name Teamdeck shows for them */
const ProfileSettings = () => {
    const { user } = useAuth0();
    const { profile, error, save } = useProfile();
    const [givenName, setGivenName] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!profile) return;
        // users whose record has no name yet start from their login's one
        const missing = !profile.givenName && !profile.familyName;
        setGivenName(missing ? (user?.given_name ?? '') : profile.givenName);
        setFamilyName(missing ? (user?.family_name ?? '') : profile.familyName);
    }, [profile, user]);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaved(
            await save({
                givenName: givenName.trim(),
                familyName: familyName.trim(),
            })
        );
    };

    return (
        <section aria-labelledby="profile-settings" className="mb-5">
            <h2 className="h4 fw-bold mb-3" id="profile-settings">
                Profile
            </h2>
            <form onSubmit={onSubmit}>
                <ErrorAlert message={error} />
                <div className="card dashboard-card mb-3">
                    <div className="card-body">
                        <h3 className="h5 fw-semibold">Your name</h3>
                        <p className="text-secondary small">
                            Shown to your teammates in rooms and teams. It
                            doesn&apos;t change the name on your login account.
                        </p>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label
                                    htmlFor="givenName"
                                    className="form-label"
                                >
                                    Given name
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="givenName"
                                    value={givenName}
                                    maxLength={100}
                                    required
                                    onChange={(e) => {
                                        setGivenName(e.target.value);
                                        setSaved(false);
                                    }}
                                />
                            </div>
                            <div className="col-md-6">
                                <label
                                    htmlFor="familyName"
                                    className="form-label"
                                >
                                    Family name
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="familyName"
                                    value={familyName}
                                    maxLength={100}
                                    required
                                    onChange={(e) => {
                                        setFamilyName(e.target.value);
                                        setSaved(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!profile}
                    >
                        Save name
                    </button>
                    {saved && (
                        <span className="text-success small" role="status">
                            Saved
                        </span>
                    )}
                </div>
            </form>
        </section>
    );
};

export default ProfileSettings;
