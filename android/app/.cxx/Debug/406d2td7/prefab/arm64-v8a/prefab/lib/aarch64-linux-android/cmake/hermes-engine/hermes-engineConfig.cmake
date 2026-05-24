if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/prabhatbarman/.gradle/caches/9.3.1/transforms/1b0367a5f26d8c2375fa3422f904d586/transformed/hermes-android-250829098.0.10-debug/prefab/modules/hermesvm/libs/android.arm64-v8a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/prabhatbarman/.gradle/caches/9.3.1/transforms/1b0367a5f26d8c2375fa3422f904d586/transformed/hermes-android-250829098.0.10-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

