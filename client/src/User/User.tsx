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

const User = ({ userSub, user }: UserProps) => {
    console.log('User component rendered with userSub:', userSub);
    console.log('User component rendered with user:', user);
    const displayName = user.given_name
        ? `${user.given_name} ${user.family_name}`
        : user.nickname;
    return userSub === user.auth0_sub ? (
        <button className="btn btn-primary mx-2">{displayName}</button>
    ) : (
        <button className="btn btn-secondary mx-2">{displayName}</button>
    );
};

export default User;
