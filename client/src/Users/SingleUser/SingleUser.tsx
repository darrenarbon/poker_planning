interface UserProps {
    userSub: string | undefined;
    user: UserModel;
}

export interface UserModel {
    auth0_sub: string | undefined;
    given_name: string | undefined;
    family_name: string | undefined;
    nickname: string | undefined;
}

const SingleUser = ({ userSub, user }: UserProps) => {
    const displayName = user.given_name
        ? `${user.given_name} ${user.family_name}`
        : user.nickname;
    return userSub === user.auth0_sub ? (
        <button className="btn btn-primary mx-2" disabled>
            {displayName}
        </button>
    ) : (
        <button className="btn btn-secondary mx-2" disabled>
            {displayName}
        </button>
    );
};

export default SingleUser;
