import React from 'react';
import { AsyncStorage } from 'react-native';
import { Container, Content, Spinner } from 'native-base';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { TOKEN_KEY } from 'ecommerce-client/src/constants';

const refreshTokenMutation = gql`
  mutation {
    refreshToken {
      token
    }
  }
`;

@compose(graphql(refreshTokenMutation))
class DefaultRoute extends React.Component {
  async componentDidMount() {
    const token = await AsyncStorage.getItem(TOKEN_KEY);

    if (!token) {
      this.props.history.push('/signup');
      return;
    }

    let response;
    try {
      response = await this.props.mutate();
    } catch (err) {
      this.props.history.push('/signup');
      return;
    }

    const {
      refreshToken: { token: newToken },
    } = response.data;
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    this.props.history.push('/products');
  }

  render() {
    return (
      <Container>
        <Content>
          <Spinner color="red" />
        </Content>
      </Container>
    );
  }
}

export default DefaultRoute;
