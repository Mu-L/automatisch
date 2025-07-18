const getUserByUsername = async ($, username) => {
  const response = await $.http.get(`/2/users/by/username/${username}`);

  if (response.data.errors) {
    const errorMessages = response.data.errors
      .map((error) => error.detail)
      .join(' ');

    throw new Error(`Error occurred while fetching user data: ${errorMessages}`);
  }

  const user = response.data.data;
  return user;
};

export default getUserByUsername;
