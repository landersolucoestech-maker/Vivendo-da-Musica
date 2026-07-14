interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
};

const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

const UserAvatar = ({ name, size = 'md' }: UserAvatarProps) => (
  <div className={`rounded-full bg-gradient-brand flex items-center justify-center font-semibold text-white shrink-0 ${SIZE_CLASSES[size]}`}>
    {getInitials(name)}
  </div>
);

export default UserAvatar;
