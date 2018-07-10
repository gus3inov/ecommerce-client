import React, { Component } from 'react';
import { Font, AppLoading } from 'expo';
import { AsyncStorage } from 'react-native';
import { ApolloProvider } from 'react-apollo';
import ApolloClient, { InMemoryCache } from 'apollo-client-preset';
import { setContext } from 'apollo-link-context';
import { createHttpLink } from 'apollo-link-http';
import Routes from './Routes';
import { TOKEN_KEY } from './constants';

const httpLink = createHttpLink({
  uri: 'http://10.0.3.2:4000',
  credentials: 'same-origin',
});

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  console.log(token);
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const client = new ApolloClient({
  uri: 'http://10.0.3.2:4000',
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

class App extends Component {
  state = {
    loading: true,
  };

  async componentDidMount() {
    await Font.loadAsync({
      'Roboto': require('native-base/Fonts/Roboto.ttf'),
      'Roboto_medium': require('native-base/Fonts/Roboto_medium.ttf'),
    });
    this.setState({ loading: false });
  }

  render() {
    const { loading } = this.state;

    if (loading) {
      return (
        <ApolloProvider client={client}>
          <AppLoading />
        </ApolloProvider>
      );
    }

    return (
      <ApolloProvider client={client}>
        <Routes />
      </ApolloProvider>
    );
  }
}

export default App;
