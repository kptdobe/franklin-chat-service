echo "Setting the current context to $CLUSTER_NAME and $NAMESPACE..."

# Switch the k8s context
kubectl config use-context "${CLUSTER_NAME//-/}"

# Set the namespace for the current context
kubectl config set-context --current --namespace="${NAMESPACE}"
