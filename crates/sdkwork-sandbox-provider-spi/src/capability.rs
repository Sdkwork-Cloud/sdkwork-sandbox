#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum RuntimeCapability {
    Terminal,
    Filesystem,
    Git,
    Build,
    Browser,
    PortForward,
    McpTransport,
    Environment,
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum IsolationAssurance {
    HostUser,
    Container,
    UserSpaceKernel,
    MicroVm,
    DedicatedVm,
}
