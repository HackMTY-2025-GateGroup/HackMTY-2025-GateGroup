import { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = useMemo(
    () => user?.email?.split('@')[0] ?? 'User',
    [user]
  );

  const handleSignOut = async () => {
    await signOut();
    // signOut in AuthContext navigates to /login, but keep this safe
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground mt-1 mb-10">Manage your account details</p>
        </div>
      </div>

      <Card className="flex max-w-2xl justify-center mx-auto flex-col">
        <CardHeader className="flex items-center gap-4">
          <Avatar>
            {user?.user_metadata?.avatar ? (
              <AvatarImage src={user.user_metadata.avatar} alt={displayName} />
            ) : (
              <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex text-center flex-col">
            <CardTitle className="text-lg">{displayName}</CardTitle>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="ml-auto">
            <Badge className="capitalize">{userRole ?? 'User'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This section is a lightweight profile area. Add editable fields or preferences here.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>
                Back Home
              </Button>
              <Button variant="destructive" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;