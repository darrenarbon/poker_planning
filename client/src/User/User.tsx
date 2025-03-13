interface UserProps {
  userSub: string | undefined;
  user: UserModel;
}

export interface UserModel {
  sub: string | undefined;
  givenName: string | undefined;
  familyName: string | undefined;
  nickname: string | undefined;
}

const User = ({ userSub, user }: UserProps) => {
  const displayName = user.givenName
    ? `${user.givenName} ${user.familyName}`
    : user.nickname;
  return userSub === user.sub ? (
    <button className="btn btn-primary mx-2">{displayName}</button>
  ) : (
    <button className="btn btn-secondary mx-2">{displayName}</button>
  );
};

export default User;
