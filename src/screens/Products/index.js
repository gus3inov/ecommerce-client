import React from 'react';
import {
  FlatList,
  AsyncStorage,
  Picker,
  ActivityIndicator,
} from 'react-native';
import {
  Icon,
  Button,
  Text,
  Container,
  Header,
  Item,
  Input,
} from 'native-base';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import jwtDecode from 'jwt-decode';
import Screen from 'ecommerce-client/src/ui/templates/Screen';
import ProductCard from 'ecommerce-client/src/ui/organisms/ProductCard';
import TextField from 'ecommerce-client/src/ui/atoms/TextField';
import { TOKEN_KEY } from 'ecommerce-client/src/constants';

export const productsQuery = gql`
  query(
    $after: String
    $orderBy: ProductOrderByInput
    $where: ProductWhereInput
  ) {
    productsConnection(
      after: $after
      first: 5
      orderBy: $orderBy
      where: $where
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          price
          pictureUrl
          name
          seller {
            id
          }
        }
      }
    }
  }
`;

const editProductMutation = gql`
  mutation($id: ID!, $price: Float) {
    updateProduct(id: $id, price: $price) {
      __typename
      id
      name
      price
      pictureUrl
      seller {
        id
      }
    }
  }
`;

const productsSubscription = gql`
  subscription {
    product(where: { mutation_in: UPDATED }) {
      node {
        __typename
        id
        name
        price
        pictureUrl
        seller {
          id
        }
      }
    }
  }
`;

const deleteProductMutation = gql`
  mutation($id: ID!) {
    deleteProduct(where: { id: $id }) {
      id
    }
  }
`;

@compose(
  graphql(productsQuery, {
    options: {
      variables: {
        orderBy: 'createdAt_ASC',
      },
    },
  }),
  graphql(deleteProductMutation, {
    name: 'deleteProduct',
  }),
  graphql(editProductMutation, {
    name: 'editProductMutate',
  })
)
class Products extends React.Component {
  calledOnce = false;

  state = {
    userId: null,
    searchValue: '',
    sort: 'name',
  };

  async componentDidMount() {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const { userId } = jwtDecode(token);
    this.setState({
      userId,
    });
    this.props.data.subscribeToMore({
      document: productsSubscription,
      updateQuery: (prev, { subscriptionData }) => {
        console.log(subscriptionData.data);
        if (!subscriptionData.data || +!subscriptionData.data.product) {
          return prev;
        }

        const { node } = subscriptionData.data.product;

        prev.productsConnection.edges = prev.productsConnection.edges.map(x =>
          x.node.id === node.id
            ? { __typename: 'Node', cursor: node.id, node }
            : x
        );

        return prev;
      },
    });
  }

  deleteProduct = async id => {
    const {
      deleteProduct,
      data: { variables },
    } = this.props;
    await deleteProduct({
      variables: {
        id,
      },
      update: store => {
        const data = store.readQuery({
          query: productsQuery,
          variables,
        });
        data.productsConnection.edges = data.productsConnection.edges.filter(
          x => x.node.id !== id
        );
        store.writeQuery({
          query: productsQuery,
          data,
          variables,
        });
      },
    });
  };

  recordProduct = data =>
    this.props.history.push({
      pathname: `products/record/${data.id}`,
      state: data,
    });

  onChangeText = value => {
    const {
      data: { refetch },
    } = this.props;

    this.setState({
      searchValue: value,
    });

    refetch({
      where: {
        name_contains: value,
      },
      after: null,
    });
  };

  handleSort = value => {
    const {
      data: { refetch, variables },
      loading,
    } = this.props;

    if (value === 'name') {
      !loading &&
        refetch({
          orderBy: variables.orderBy === 'name_ASC' ? 'name_DESC' : 'name _ASC',
          after: null,
        });
    } else {
      !loading &&
        refetch({
          orderBy:
            variables.orderBy === 'price_ASC' ? 'price_DESC' : 'price_ASC',
          after: null,
        });
    }

    this.setState({
      sort: value,
    });
  };

  handleEndReached = () => {
    const {
      data: { productsConnection, fetchMore },
      loading,
    } = this.props;
    if (!loading && productsConnection.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          after: productsConnection.pageInfo.endCursor,
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return previousResult;
          }

          if (
            (!previousResult && previousResult.productsConnection) ||
            !previousResult.productsConnection.edges
          ) {
            return fetchMoreResult;
          }

          return {
            productsConnection: {
              __typename: 'ProductConnection',
              pageInfo: fetchMoreResult.productsConnection.pageInfo,
              edges: [
                ...previousResult.productsConnection.edges,
                ...fetchMoreResult.productsConnection.edges,
              ],
            },
          };
        },
      });
    }
  };

  increasePrise = item => {
    const { editProductMutate } = this.props;

    editProductMutate({
      variables: {
        id: item.id,
        price: item.price + 5,
      },
    });
  };

  render() {
    const {
      data: { subscribeToMore, productsConnection, variables },
      loading,
      history,
    } = this.props;
    const { userId, searchValue, sort } = this.state;
    if (loading || !productsConnection) {
      return null;
    }

    return (
      <Screen title="Products">
        <Header searchBar rounded>
          <Item>
            <Icon name="ios-search" />
            <Input
              placeholder="Search"
              name="search"
              value={searchValue}
              onChangeText={this.onChangeText}
            />
            <Icon name="ios-people" />
          </Item>
        </Header>
        <Button
          onPress={() =>
            history.push({
              pathname: '/products/add',
              state: variables,
            })
          }
          iconLeft
          light
        >
          <Icon name="add" />
          <Text> {'Create product'} </Text>
        </Button>
        <Picker
          selectedValue={sort}
          style={{
            height: 50,
            width: 100,
          }}
          onValueChange={this.handleSort}
        >
          <Picker.Item label="Name" value="name" />
          <Picker.Item label="Price" value="price" />
        </Picker>
        {productsConnection.edges.length !== 0 && (
          <FlatList
            keyExtractor={item => item.id}
            ListFooterComponent={() =>
              productsConnection.pageInfo.hasNextPage && (
                <ActivityIndicator size="large" color="#00ff00" />
              )
            }
            onEndReached={this.handleEndReached}
            data={productsConnection.edges.map(x => ({
              ...x.node,
              showButtons: userId === x.node.seller.id,
            }))}
            renderItem={({ item }) => (
              <ProductCard
                key={item.id}
                userId={userId}
                data={item}
                handlePrise={this.increasePrise}
                handleRecord={this.recordProduct}
                handleDelete={this.deleteProduct}
              />
            )}
          />
        )}
      </Screen>
    );
  }
}

export default Products;
