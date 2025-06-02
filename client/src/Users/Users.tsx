import { User } from '@auth0/auth0-react';
import SingleUser from './SingleUser';
import { UserModel } from './SingleUser/SingleUser';

type UserProps = {
    users: UserModel[];
    loggedInUser: User;
};

const PokerSession = ({ loggedInUser, users }: UserProps) => {
    return (
        <div>
            <h4>Players</h4>
            {users.map((u) => (
                <SingleUser
                    key={u.auth0_sub}
                    userSub={loggedInUser.sub}
                    user={u}
                />
            ))}
            <hr />
        </div>
    );
};

export default PokerSession;
